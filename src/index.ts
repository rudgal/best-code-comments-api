import { Hono } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' assert { type: 'json' }
import * as sharp from 'sharp'
import { Buffer } from 'node:buffer'
import type { Comment } from './types'
import {
  filterComments, filterStatic, getRandomComment, generateCommentSvg, SVG_DEFAULT_WIDTH, isCommentExcluded,
  isDevEnv, IMAGE_CACHE_MAX_AGE
} from './utils'
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
  const { id, ...queryParams } = c.req.query()

  let comment: Comment | undefined

  if (id) { // If ID is provided, generate image directly
    comment = commentsPreFiltered.find(c => c.id === parseInt(id, 10))
  } else { // If no ID, pick random and redirect
    const { tags, author } = queryParams
    const filtered = filterComments(commentsPreFiltered, tags, author)
    const randomComment = filtered.length > 0 ? getRandomComment(filtered) : undefined

    if (!randomComment) {
      return c.json({ error: 'No comments found with specified filters' }, 404)
    }

    // Construct redirect URL
    const newUrl = `/comment.png?id=${randomComment.id}`
    const searchParams = new URLSearchParams(queryParams as Record<string, string>)
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `${newUrl}&${queryString}` : newUrl

    return c.redirect(redirectUrl)
  }

  // If comment was found (either by ID or after redirect), proceed with generation
  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const { theme = 'light', width = SVG_DEFAULT_WIDTH } = queryParams
  const svg = generateCommentSvg(comment, theme, width)

  try {
    const buffer = await sharp.default(Buffer.from(svg))
      .png()
      .toBuffer()

    c.header('Content-Type', 'image/png')
    c.header('Cache-Control', `public, max-age=${IMAGE_CACHE_MAX_AGE}, immutable`) // Add caching
    return c.body(buffer.buffer as ArrayBuffer)
  } catch (error) {
    console.error('Image generation error:', error)
    return c.text('Error generating image', 500)
  }
})

// SVG generation endpoint
app.get('/comment.svg', async (c) => {
  const { id, ...queryParams } = c.req.query()

  let comment: Comment | undefined

  if (id) {
    comment = commentsPreFiltered.find(c => c.id === parseInt(id, 10))
  } else {
    const { tags, author } = queryParams
    const filtered = filterComments(commentsPreFiltered, tags, author)
    const randomComment = filtered.length > 0 ? getRandomComment(filtered) : undefined

    if (!randomComment) {
      return c.json({ error: 'No comments found with specified filters' }, 404)
    }

    const newUrl = `/comment.svg?id=${randomComment.id}`
    const searchParams = new URLSearchParams(queryParams as Record<string, string>)
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `${newUrl}&${queryString}` : newUrl

    return c.redirect(redirectUrl)
  }

  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const { theme = 'light', width = SVG_DEFAULT_WIDTH } = queryParams
  const svg = generateCommentSvg(comment, theme, width)

  c.header('Content-Type', 'image/svg+xml')
  c.header('Cache-Control', `public, max-age=${IMAGE_CACHE_MAX_AGE}, immutable`) // Add caching
  return c.body(svg)
})


if (isDevEnv()) {
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
            const styleParagraph = isExcluded ? 'font-weight: bold;' : '';
            const styleListItem = isExcluded ? 'background-color: #ff9f9f;' : '';
            return `
            <li style="${styleListItem}">
              <p style="${styleParagraph}"><strong>ID:</strong> ${comment.id}</p>
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
