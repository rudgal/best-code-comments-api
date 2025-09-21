import { Hono } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' assert { type: 'json' }

const app = new Hono()

// Enable CORS for all routes
app.use('/*', cors())

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'BestCodeComments API',
    version: pkg.version,
    endpoints: {
      api: '/api/random, /api/comments, /api/comments/:id',
      image: '/comment.png',
      embed: '/embed.js'
    },
    totalComments: 0
  })
})

const port = process.env.PORT || 3000
console.log(`🚀 BestCodeComments API running on port ${port}`)

export default app