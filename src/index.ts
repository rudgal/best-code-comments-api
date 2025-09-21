import { Hono } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' assert { type: 'json' }
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { Comment } from './types'
import { filterComments, getRandomComment } from './utils'

// --- Data Loading ---

const __dirname = dirname(fileURLToPath(import.meta.url))
let comments: Comment[] = []

try {
  const jsonPath = join(__dirname, '../dist/comments.json')
  comments = JSON.parse(readFileSync(jsonPath, 'utf8'))
} catch (error) {
  console.error("⚠️ Could not read or parse 'dist/comments.json'.")
  console.error("➡️ Please run 'bun run build' to generate the comments data.")
}

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
      image: '/comment.png',
      embed: '/embed.js'
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

const port = process.env.PORT || 3000
console.log(`🚀 BestCodeComments API running on port ${port}`)

export default app
