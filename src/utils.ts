import type { Comment } from './types.js'
import { escape } from 'lodash-es'
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
  const hostedByColor = theme === 'dark' ? '#7d8590' : '#6e7781'
  const borderColor = theme === 'dark' ? '#30363d' : '#d0d7de'
  const accentColor = theme === 'dark' ? '#58a6ff' : '#0969da'

  const lineHeight = 24
  const padding = 32
  const estimatedCharWidth = 9.4;

  const availableWidthForText = parseInt(width) - (2 * padding);
  const dynamicMaxCharsPerLine = Math.floor(availableWidthForText / estimatedCharWidth);

  const wrappedLines: string[] = [];
  comment.content.split('\n').forEach(line => {
    wrapText(line, dynamicMaxCharsPerLine).forEach(wrappedLine => wrappedLines.push(wrappedLine));
  });

  const height = Math.max(140, (wrappedLines.length * lineHeight) + (padding * 3.5))
  const hostedByUrl = process.env.HOSTED_BY_URL || (process.env.HOSTED_BY ? `https://${process.env.HOSTED_BY}` : '');
  const googleFontsUrl = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Roboto:wght@400;500&display=swap';

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style type="text/css"><![CDATA[
          @import url('${googleFontsUrl}');
          .comment-line {
            font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            font-size: 16px;
            fill: ${textColor};
          }
          .author-line {
            font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            fill: ${authorColor};
          }
          .hosted-by-line {
            font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            fill: ${hostedByColor};
          }
        ]]></style>
      </defs>
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <rect x="1" y="1" width="${parseInt(width) - 2}" height="${height - 2}" 
            fill="none" stroke="${borderColor}" stroke-width="2" rx="6"/>
      <rect x="0" y="0" width="4" height="${height}" fill="${accentColor}"/>
      
      ${wrappedLines.map((line, i) =>
    `<text x="${padding}" y="${padding + (i + 1) * lineHeight}" class="comment-line" xml:space="preserve">${escape(line)}</text>`
  ).join('')}
      <a href="${comment.source}" target="_blank">
        <text x="${padding}" y="${height - padding}" class="author-line">
          — ${escape(comment.author)}
        </text>
      </a>
      
      ${process.env.HOSTED_BY ? `
        <a href="${hostedByUrl}" target="_blank">
         <text x="${parseInt(width) - padding}" y="${height - padding}" 
              text-anchor="end" class="hosted-by-line">
          ${process.env.HOSTED_BY}
        </text>
        </a>
      ` : ''}
    </svg>
  `
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
