import { Hono } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' assert { type: 'json' }
import * as sharp from 'sharp'
import { Buffer } from 'node:buffer'
import type { Comment } from './types'
import { filterComments, filterStatic, getRandomComment, generateCommentSvg, SVG_DEFAULT_WIDTH, isCommentExcluded } from './utils'
import commentsData from './data/comments.json' assert { type: 'json' }

// --- Data Loading ---

const commentsAll: Comment[] = commentsData as Comment[]
const commentsPreFiltered: Comment[] = filterStatic(commentsAll);


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
    totalComments: commentsAll.length
  })
})

// REST API: Get random comment
app.get('/api/random', (c) => {
  const { tags, author } = c.req.query()

  const randomComment = getRandomComment(commentsPreFiltered);

  if (!randomComment) {
    return c.json({ error: 'No comments found with specified filters' }, 404)
  }

  return c.json(randomComment)
})

// REST API: Get comment by ID
app.get('/api/comment/:id', (c) => {
  const idParam = c.req.param('id')
  const numericId = parseInt(idParam, 10)
  if (isNaN(numericId)) {
    return c.json({ error: 'Invalid comment ID' }, 400)
  }
  const comment = commentsAll.find(c => c.id === numericId)

  if (!comment) {
    return c.json({ error: 'Comment not found' }, 404)
  }

  return c.json(comment)
})

// Image generation endpoint
app.get('/comment.png', async (c) => {
  const { theme = 'light', width = SVG_DEFAULT_WIDTH, id, tags, author } = c.req.query()

  let comment: Comment | undefined

  if (id) {
    comment = commentsPreFiltered.find(c => c.id === parseInt(id, 10))
  } else {
    const filtered = filterComments(commentsPreFiltered, tags, author)
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
  const { theme = 'light', width = SVG_DEFAULT_WIDTH, id, tags, author } = c.req.query()

  let comment: Comment | undefined

  if (id) {
    comment = commentsPreFiltered.find(c => c.id === parseInt(id, 10))
  } else {
    const filtered = filterComments(commentsPreFiltered, tags, author)
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


if (process.env.NODE_ENV === 'development') {
  app.get('/all', (c) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>All Comments</title>
        <style>
          body { font-family: sans-serif; margin: 2em; }
          ul { list-style-type: none; padding: 0; }
          li { margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 5px; }
          pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; white-space: pre-wrap; word-wrap: break-word; max-width: 100%; }
          code { font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>All Comments (${commentsAll.length})</h1>
        <ul>
          ${commentsAll.map(comment => {
            const isExcluded = isCommentExcluded(comment);
            const idStyle = isExcluded ? 'color: red; font-weight: bold;' : '';
            return `
            <li>
              <p style="${idStyle}"><strong>ID:</strong> ${comment.id}</p>
            ${generateCommentSvg(comment)}
            </li>
          `;
          }).join('')}
        </ul>
      </body>
      </html>
    `;
    c.header('Content-Type', 'text/html');
    return c.body(html);
  })
}

const port = process.env.PORT || 3000
console.log(`🚀 BestCodeComments API running on port ${port}`)

export default app
