import type { Comment } from './types.js'
import path from 'path';

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
    const tagList = tags.split(',').map(t => t.trim().toLowerCase())
    filtered = filtered.filter(comment =>
      tagList.some(tag =>
        comment.tags.map(t => t.toLowerCase()).includes(tag)
      )
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

// Configure Sharp to use custom fonts so that rendering also works on vercel
// see https://github.com/lovell/sharp/issues/2499
export function setupFontsForVercel() {
  const fontConfigPath = path.join(process.cwd(), 'fonts', 'fonts.conf');
  const fontPath1 = path.join(process.cwd(), 'fonts', 'JetBrainsMono-VariableFont_wght.ttf');
  const fontPath2 = path.join(process.cwd(), 'fonts', 'Roboto-VariableFont_wdth,wght.ttf');
  if (process.env.NODE_ENV === 'production') {
    process.env.FONTCONFIG_PATH = '/var/task/fonts';
    process.env.LD_LIBRARY_PATH = '/var/task';
  }

}
