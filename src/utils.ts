import type { Comment } from './types.js'

export const SVG_DEFAULT_WIDTH = '820';
export const MAX_LINES = 25;
export const MIN_POPULARITY = 2;
export const IMAGE_CACHE_MAX_AGE = 2678400;

export function isDevEnv() {
  return process.env.NODE_ENV === 'development'
}

export function getRandomComment(comments: Comment[]): Comment | undefined {
  if (comments.length === 0) {
    return undefined
  }
  return comments[Math.floor(Math.random() * comments.length)]
}

type CommentFilters = {
  tags?: string
  author?: string
  maxLines?: number
  minPopularity?: number
}

export function filterComments(
  comments: Comment[],
  {tags, author, maxLines = MAX_LINES, minPopularity = MIN_POPULARITY}: CommentFilters = {}
): Comment[] {
  let filtered = comments

  filtered = filtered
    .filter(comment => checkNumberOfLines(comment, maxLines))
    .filter(comment => checkPopularity(comment, minPopularity))

  if (tags) {
    const tagSet = new Set(
      tags
        .split(/[\s,]+/)
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
    )
    filtered = filtered.filter(comment =>
      comment.tags.some(tag => tagSet.has(tag.toLowerCase()))
    )
  }

  if (author) {
    filtered = filtered.filter(comment =>
      comment.author.toLowerCase().includes(author.toLowerCase())
    )
  }

  return filtered
}

export function checkNumberOfLines(comment: Comment, maxLines: number = MAX_LINES) {
  return comment.content.split('\n').length <= maxLines
}

export function checkPopularity(comment: Comment, minPopularity: number = MIN_POPULARITY) {
  return comment.popularity >= minPopularity
}

export function isCommentExcluded(comment: Comment): boolean {
  return !checkNumberOfLines(comment) || !checkPopularity(comment);
}

export function setupFontsForVercel() {
  if (process.env.NODE_ENV === 'production') {
    process.env.FONTCONFIG_PATH = '/var/task/fonts';
    process.env.LD_LIBRARY_PATH = '/var/task';
  }
}

type QueryRecord = Record<string, string | undefined>

export function parseNumberQueryParam(value: string | undefined, fallback: number): number {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export function getQueryParam(query: QueryRecord, key: string): string | undefined {
  const target = key.toLowerCase()
  for (const [queryKey, value] of Object.entries(query)) {
    if (queryKey.toLowerCase() === target && typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  }
  return undefined
}

export function cloneQueryWithout(query: QueryRecord, keys: string[]): Record<string, string> {
  const exclude = new Set(keys.map(key => key.toLowerCase()))
  return Object.entries(query).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string' && !exclude.has(key.toLowerCase())) {
      acc[key] = value
    }
    return acc
  }, {})
}
