import { parse } from 'csv-parse/sync'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import type { Comment, CommentTag } from '../src/types.js'
import { COMMENT_TAGS } from '../src/types.js'
import { checkNumberOfLines, checkPopularity, isDevEnv } from '../src/utils.js'

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

  const commentTags = new Set<CommentTag>(COMMENT_TAGS)

  const comments: Comment[] = records.map((row: any) => ({
    id: parseInt(row.id, 10),
    author: row.author || 'Anonymous',
    date: row.date,
    source: row.source || null,
    popularity: parseInt(row.popularity, 10),
    tags: parseTags(row, commentTags),
    content: row.content
  }))

  const tagCounts = new Map<CommentTag, number>()
  comments.forEach(comment => {
    const uniqueTags = new Set(comment.tags)
    uniqueTags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    })
  })

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

  const tagOverview = Object.fromEntries(
    COMMENT_TAGS.map(tag => [tag, tagCounts.get(tag) ?? 0])
  )
  console.info('🏷️ Tag overview:', tagOverview)
} catch (error) {
  console.error('❌ Build failed:', error)
  process.exit(1)
}

function reportExcludedComments(comments: Comment[]) {
  if (!isDevEnv()) return

  const summary = comments.reduce(
    (acc, comment) => {
      if (!checkNumberOfLines(comment)) {
        acc.tooManyLines.push(comment.id)
      }
      if (!checkPopularity(comment)) {
        acc.tooLowPopularity.push(comment.id)
      }
      return acc
    },
    { tooManyLines: [] as number[], tooLowPopularity: [] as number[] }
  )

  if (summary.tooManyLines.length > 0) {
    console.log(`Excluded due to number of lines (${summary.tooManyLines.length}):`, summary.tooManyLines)
  }

  if (summary.tooLowPopularity.length > 0) {
    console.log(`Excluded due to popularity (${summary.tooLowPopularity.length}):`, summary.tooLowPopularity)
  }
}

type CsvRow = {
  id: string
  tags?: string
}

function parseTags(row: CsvRow, allowed: Set<CommentTag>): CommentTag[] {
  const value = row.tags
  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  const rawTags = value
    .split(/[\s,]+/)
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  const invalidTags = rawTags.filter(tag => !allowed.has(tag as CommentTag))
  if (invalidTags.length > 0) {
    console.warn(`⚠️ Ignoring unknown tag(s) for comment ${row.id}: ${invalidTags.join(', ')}`)
  }

  return rawTags.filter(tag => allowed.has(tag as CommentTag)) as CommentTag[]
}
