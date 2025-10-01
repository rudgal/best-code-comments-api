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

export function filterComments(
  comments: Comment[],
  tags?: string,
  author?: string
): Comment[] {
  let filtered = comments

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

export function checkNumberOfLines(comment: Comment) {
  return comment.content.split('\n').length <= MAX_LINES
}

export function checkPopularity(comment: Comment) {
  return comment.popularity >= MIN_POPULARITY
}

export function filterStatic(comments: Comment[]): Comment[] {
  return comments
    .filter(comment => checkNumberOfLines(comment))
    .filter(comment => checkPopularity(comment))
}

export function isCommentExcluded(comment: Comment): boolean {
  const lines = comment.content.split('\n').length;
  const popularity = comment.popularity;
  return lines > MAX_LINES || popularity < MIN_POPULARITY;
}

export function setupFontsForVercel() {
  if (process.env.NODE_ENV === 'production') {
    process.env.FONTCONFIG_PATH = '/var/task/fonts';
    process.env.LD_LIBRARY_PATH = '/var/task';
  }

}
