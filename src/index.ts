import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Comment } from './types.js'
import {
  filterComments,
  filterStatic,
  getRandomComment,
  IMAGE_CACHE_MAX_AGE,
  isCommentExcluded,
  isDevEnv,
  setupFontsForVercel,
  SVG_DEFAULT_WIDTH
} from './utils.js'
import { renderToString } from 'hono/jsx/dom/server'
import { CommentSvg } from './components/CommentSvg.js'
import * as sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// --- Data Loading ---
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const commentsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'comments.json'), 'utf-8'));
const commentsAll: Comment[] = commentsData as Comment[];
const commentsPreFiltered: Comment[] = filterStatic(commentsAll);

setupFontsForVercel();

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
  const {tags, author} = c.req.query()

  const randomComment = getRandomComment(commentsPreFiltered);

  if (!randomComment) {
    return c.json({error: 'No comments found with specified filters'}, 404)
  }

  return c.json(randomComment)
})

// REST API: Get comment by ID
app.get('/api/comment/:id', (c) => {
  const idParam = c.req.param('id')
  const numericId = parseInt(idParam, 10)
  if (isNaN(numericId)) {
    return c.json({error: 'Invalid comment ID'}, 400)
  }
  const comment = commentsAll.find(c => c.id === numericId)

  if (!comment) {
    return c.json({error: 'Comment not found'}, 404)
  }

  return c.json(comment)
})

app.get('/comment.png', async (c) => {
  return handleCommentImageRequest(c, 'png')
})

app.get('/comment.svg', async (c) => {
  return handleCommentImageRequest(c, 'svg')
})

async function handleCommentImageRequest(c: Context, imageType: 'png' | 'svg') {
  const {id, ...queryParams} = c.req.query()

  let comment: Comment | undefined

  if (id) {
    comment = commentsPreFiltered.find(c => c.id === parseInt(id, 10))
  } else {
    const {tags, author} = queryParams
    const filtered = filterComments(commentsPreFiltered, tags, author)
    const randomComment = filtered.length > 0 ? getRandomComment(filtered) : undefined

    if (!randomComment) {
      return c.json({error: 'No comments found with specified filters'}, 404)
    }

    const newUrl = `/comment.${imageType}?id=${randomComment.id}`
    const searchParams = new URLSearchParams(queryParams as Record<string, string>)
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `${newUrl}&${queryString}` : newUrl

    return c.redirect(redirectUrl)
  }

  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const {theme = 'light', width = SVG_DEFAULT_WIDTH} = queryParams
  const svg = renderToString(CommentSvg({
    comment,
    theme,
    width
  }))

  c.header('Cache-Control', `public, max-age=${IMAGE_CACHE_MAX_AGE}, immutable`)

  if (imageType === 'png') {
    try {
      const buffer = await sharp.default(Buffer.from(svg))
        .png()
        .toBuffer()

      c.header('Content-Type', 'image/png')
      return c.body(buffer.buffer as ArrayBuffer)
    } catch (error) {
      console.error('Image generation error:', error)
      return c.text('Error generating image', 500)
    }
  } else { // imageType === 'svg'
    c.header('Content-Type', 'image/svg+xml')
    return c.body(svg)
  }
}

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
            ${renderToString(CommentSvg({ comment }))}
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

export default app
