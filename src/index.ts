import { Hono } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' assert { type: 'json' }
import * as sharp from 'sharp'
import { Buffer } from 'node:buffer'
import type { Comment } from './types'
import { filterComments, getRandomComment, generateCommentSvg } from './utils'
import commentsData from './data/comments.json' assert { type: 'json' }

// --- Data Loading ---

const comments: Comment[] = commentsData as Comment[]

// --- API Server ---

const app = new Hono()

// Enable CORS for all routes
app.use('/*', cors())

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'BestCodeComments API',
    version: pkg.version,
    endpoints: {
      api: '/api/random, /api/comment/:id',
      image: '/comment.png, /comment.svg'
    },
    totalComments: comments.length
  })
})

// REST API: Get random comment
app.get('/api/random', (c) => {
  const { tags, author } = c.req.query()
  const filtered = filterComments(comments, tags, author)

  if (filtered.length === 0) {
    return c.json({ error: 'No comments found with specified filters' }, 404)
  }

  return c.json(getRandomComment(filtered))
})

// REST API: Get comment by ID
app.get('/api/comment/:id', (c) => {
  const idParam = c.req.param('id')
  const numericId = parseInt(idParam, 10)
  if (isNaN(numericId)) {
    return c.json({ error: 'Invalid comment ID' }, 400)
  }
  const comment = comments.find(c => c.id === numericId)

  if (!comment) {
    return c.json({ error: 'Comment not found' }, 404)
  }

  return c.json(comment)
})

// Image generation endpoint
app.get('/comment.png', async (c) => {
  const { theme = 'light', width = '800', id, tags, author } = c.req.query()
  
  let comment: Comment | undefined
  
  if (id) {
    comment = comments.find(c => c.id === parseInt(id, 10))
  } else {
    const filtered = filterComments(comments, tags, author)
    comment = filtered.length > 0 ? getRandomComment(filtered) : undefined
  }
  
  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const svg = generateCommentSvg(comment, theme, width)

  try {
    const buffer = await sharp.default(Buffer.from(svg))
      .png()
      .toBuffer()

    c.header('Content-Type', 'image/png')
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    return c.body(buffer.buffer as ArrayBuffer)
  } catch (error) {
    console.error('Image generation error:', error)
    return c.text('Error generating image', 500)
  }
})

// SVG generation endpoint
app.get('/comment.svg', async (c) => {
  const { theme = 'light', width = '800', id, tags, author } = c.req.query()
  
  let comment: Comment | undefined
  
  if (id) {
    comment = comments.find(c => c.id === parseInt(id, 10))
  } else {
    const filtered = filterComments(comments, tags, author)
    comment = filtered.length > 0 ? getRandomComment(filtered) : undefined
  }
  
  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const svg = generateCommentSvg(comment, theme, width)

  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  return c.body(svg)
})

const port = process.env.PORT || 3000
console.log(`🚀 BestCodeComments API running on port ${port}`)

export default app
