import { parse } from 'csv-parse/sync'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { Comment } from '../src/types'
import { checkNumberOfLines, checkPopularity, isDevEnv } from '../src/utils'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataCsvPath = join(__dirname, '../src/data/comments.csv')
const dataJsonPath = join(__dirname, '../src/data')
const distPath = join(__dirname, '../dist')

// Ensure dist directory exists
mkdirSync(distPath, {recursive: true})

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
    id: parseInt(row.id, 10),
    author: row.author || 'Anonymous',
    date: row.date,
    source: row.source || null,
    popularity: parseInt(row.popularity, 10),
    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
    content: row.content
  }))

  // Validate required fields
  comments.forEach((comment, index) => {
    if (isNaN(comment.id)) throw new Error(`Invalid ID at row ${index + 2}: ${comment.id}`)
    if (!comment.content) throw new Error(`Missing content at row ${index + 2}`)
    if (!comment.date) throw new Error(`Missing date at row ${index + 2}`)
  })

  // Sort by ID for consistency
  comments.sort((a, b) => a.id - b.id)

  reportExcludedComments(comments);

  // Check for duplicate IDs
  const ids = new Set<number>()
  comments.forEach(comment => {
    if (ids.has(comment.id)) {
      throw new Error(`Duplicate ID found: ${comment.id}`)
    }
    ids.add(comment.id)
  })

  // Write formatted version
  writeFileSync(
    join(dataJsonPath, 'comments.json'),
    JSON.stringify(comments, null, 2)
  )

  console.info(`✅ Successfully built ${comments.length} comments`)
  console.info(`📁 Output: ${dataJsonPath}/comments.json`)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}

function reportExcludedComments(comments: Comment[]) {
  if(!isDevEnv()) return;

  const excludeddueToNumberOfLines = comments.filter(c => !checkNumberOfLines(c)).map(c => c.id)
  if (excludeddueToNumberOfLines.length > 0) {
    console.log(`Excluded due to number of lines (${excludeddueToNumberOfLines.length}):`, excludeddueToNumberOfLines)
  }

  const excludedDueToPopularity = comments.filter(c => !checkPopularity(c)).map(c => c.id)
  if (excludedDueToPopularity.length > 0) {
    console.log(`Excluded due topopularity (${excludedDueToPopularity.length}):`, excludedDueToPopularity)
  }
}
