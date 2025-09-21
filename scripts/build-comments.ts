import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Comment } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataCsvPath = join(__dirname, '../data/comments.csv')
const dataJsonPath = join(__dirname, '../data')
const distPath = join(__dirname, '../dist')

// Ensure dist directory exists
mkdirSync(distPath, { recursive: true })

try {
  const csvContent = readFileSync(dataCsvPath, 'utf8')

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    quote: '"',
    escape: '"',
    relax_quotes: true,
    relax_column_count: true
  })

  const comments: Comment[] = records.map((row: any) => ({
    id: row.id.padStart(3, '0'), // Ensure 3-digit IDs
    content: row.content,
    author: row.author || 'Anonymous',
    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
    source: row.source || null,
    dateAdded: row.dateAdded
  }))

  // Validate required fields
  comments.forEach((comment, index) => {
    if (!comment.id) throw new Error(`Missing ID at row ${index + 2}`)
    if (!comment.content) throw new Error(`Missing content at row ${index + 2}`)
    if (!comment.dateAdded) throw new Error(`Missing date at row ${index + 2}`)
  })

  // Sort by ID for consistency
  comments.sort((a, b) => a.id.localeCompare(b.id))


  // Check for duplicate IDs
  const ids = new Set<string>()
  comments.forEach(comment => {
    if (ids.has(comment.id)) {
      throw new Error(`Duplicate ID found: ${comment.id}`)
    }
    ids.add(comment.id)
  })

  // Write both formatted and minified versions
  writeFileSync(
    join(dataJsonPath, 'comments.json'),
    JSON.stringify(comments, null, 2)
  )
  writeFileSync(
    join(distPath, 'comments.min.json'),
    JSON.stringify(comments)
  )

  console.log(`✅ Successfully built ${comments.length} comments`)
  console.log(`📁 Output: ${dataJsonPath}/comments.json`)
  console.log(`📁 Output: ${distPath}/comments.min.json`)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}