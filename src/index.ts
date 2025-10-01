import { Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Comment } from './types.js'
import {
  filterComments,
  checkNumberOfLines,
  checkPopularity,
  getRandomComment,
  IMAGE_CACHE_MAX_AGE,
  isDevEnv,
  MAX_LINES,
  MIN_POPULARITY,
  setupFontsForVercel,
  SVG_DEFAULT_WIDTH, getQueryParam, cloneQueryWithout, parseNumberQueryParam
} from './utils.js'
import * as sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { renderCommentSvg } from './components/commentsSvg.js';
import { renderAllCommentsPage } from './components/commentsAllPage.js';

// --- Data Loading ---
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
const commentsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'comments.json'), 'utf-8'));
const commentsAll: Comment[] = commentsData as Comment[];

setupFontsForVercel();

// --- API Server ---

const app = new Hono()

// Enable CORS for all routes
app.use('/*', cors())

// Health check
app.get('/health', (c) => {
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

const repoUrl = process.env.VERCEL_GIT_REPOSITORY_URL || 'https://github.com/rudgal/best-code-comments-api';
app.get('/', (c) => c.redirect(repoUrl))

// REST API: Get random comment
app.get('/api/random', (c) => {
  const query = c.req.query()
  const tags = getQueryParam(query, 'tags')
  const author = getQueryParam(query, 'author')
  const maxLinesRaw = getQueryParam(query, 'maxLines')
  const minPopularityRaw = getQueryParam(query, 'minPopularity')
  const maxLines = parseNumberQueryParam(maxLinesRaw, MAX_LINES)
  const minPopularity = parseNumberQueryParam(minPopularityRaw, MIN_POPULARITY)

  const filtered = filterComments(commentsAll, {tags, author, maxLines, minPopularity})
  const randomComment = getRandomComment(filtered)

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
  const query = c.req.query()
  const id = getQueryParam(query, 'id')
  const tagsRaw = getQueryParam(query, 'tags')
  const authorRaw = getQueryParam(query, 'author')
  const maxLinesRaw = getQueryParam(query, 'maxLines')
  const minPopularityRaw = getQueryParam(query, 'minPopularity')
  const restParams = cloneQueryWithout(query, ['id', 'tags', 'author', 'maxLines', 'minPopularity'])

  const maxLines = parseNumberQueryParam(maxLinesRaw, MAX_LINES)
  const minPopularity = parseNumberQueryParam(minPopularityRaw, MIN_POPULARITY)
  const tagsFilter = tagsRaw
  const authorFilter = authorRaw

  let comment: Comment | undefined

  if (id) {
    const numericId = Number.parseInt(id, 10)
    if (Number.isNaN(numericId)) {
      return c.json({error: 'Invalid comment ID'}, 400)
    }
    const candidate = commentsAll.find(c => c.id === numericId)
    if (candidate && checkNumberOfLines(candidate, maxLines) && checkPopularity(candidate, minPopularity)) {
      comment = candidate
    }
  } else {
    const filtered = filterComments(commentsAll, {
      tags: tagsFilter,
      author: authorFilter,
      maxLines,
      minPopularity
    })
    const randomComment = filtered.length > 0 ? getRandomComment(filtered) : undefined

    if (!randomComment) {
      return c.json({error: 'No comments found with specified filters'}, 404)
    }

    const newUrl = `/comment.${imageType}?id=${randomComment.id}`
    const searchParams = new URLSearchParams()
    Object.entries(restParams)
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .forEach(([key, value]) => {
        searchParams.append(key, value)
      })
    const queryString = searchParams.toString()
    const redirectUrl = queryString ? `${newUrl}&${queryString}` : newUrl

    return c.redirect(redirectUrl)
  }

  if (!comment) {
    return c.text('Comment not found', 404)
  }

  const theme = restParams['theme'] ?? 'light'
  const width = restParams['width'] ?? SVG_DEFAULT_WIDTH
  const svg = renderCommentSvg({
    comment,
    theme,
    width
  })

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
    const html = renderAllCommentsPage({comments: commentsAll})
    c.header('Content-Type', 'text/html')
    return c.body(html)
  })
}



export default app
