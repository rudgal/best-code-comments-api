import type { Comment } from './types'
import { escape } from 'lodash'

export const SVG_DEFAULT_WIDTH = '820';
export const MAX_CHARS_PER_LINE = 80;
export const MAX_LINES = 25;
export const MIN_POPULARITY = 2;

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

export function checkNumberOfLines(comment: Comment){
  return comment.content.split('\n').length <= MAX_LINES
}

export function checkPopularity(comment: Comment){
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

function wrapText(text: string, charLimit: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length <= charLimit) {
      currentLine += (currentLine === '' ? '' : ' ') + word;
    } else {
      if (currentLine !== '') {
        lines.push(currentLine);
      }
      currentLine = word;
      while (currentLine.length > charLimit) {
        lines.push(currentLine.substring(0, charLimit));
        currentLine = currentLine.substring(charLimit);
      }
    }
  }
  if (currentLine !== '') {
    lines.push(currentLine);
  }
  return lines;
}

export function generateCommentSvg(comment: Comment, theme: string = 'light', width = SVG_DEFAULT_WIDTH): string {
  const bgColor = theme === 'dark' ? '#0d1117' : '#ffffff'
  const textColor = theme === 'dark' ? '#c9d1d9' : '#24292f'
  const authorColor = theme === 'dark' ? '#8b949e' : '#57606a'
  const borderColor = theme === 'dark' ? '#30363d' : '#d0d7de'
  const accentColor = theme === 'dark' ? '#58a6ff' : '#0969da'

  const lineHeight = 24
  const padding = 32

  const wrappedLines: string[] = [];
  comment.content.split('\n').forEach(line => {
    wrapText(line, MAX_CHARS_PER_LINE).forEach(wrappedLine => wrappedLines.push(wrappedLine));
  });

  const height = Math.max(200, (wrappedLines.length * lineHeight) + (padding * 3) + 40)

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <rect x="1" y="1" width="${parseInt(width) - 2}" height="${height - 2}" 
            fill="none" stroke="${borderColor}" stroke-width="2" rx="6"/>
      <rect x="0" y="0" width="4" height="${height}" fill="${accentColor}"/>
      
      ${wrappedLines.map((line, i) =>
    `<text x="${padding}" y="${padding + (i + 1) * lineHeight}" fill="${textColor}" font-family="ui-monospace, monospace" font-size="16" xml:space="preserve">${escape(line)}</text>`
  ).join('')}
      
      <text x="${padding}" y="${height - padding}" fill="${authorColor}" 
            font-family="system-ui, sans-serif" font-size="14">
        — ${escape(comment.author)}
      </text>
      
      ${comment.tags.length > 0 ? `
        <text x="${parseInt(width) - padding}" y="${height - padding}" 
              text-anchor="end" fill="${authorColor}" 
              font-family="system-ui, sans-serif" font-size="12">
          ${comment.tags.slice(0, 3).join(', ')}
        </text>
      ` : ''}
    </svg>
  `
}
