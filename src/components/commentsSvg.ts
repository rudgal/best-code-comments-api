import type { Comment } from '../types.js'
import { SVG_DEFAULT_WIDTH } from '../utils.js'

const lineHeight = 24
const padding = 32
const estimatedCharWidth = 9.4
const googleFontsUrl = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Roboto:wght@400;500&display=swap'

function wrapText(text: string, charLimit: number): string[] {
  if (text.length === 0) {
    return ['']
  }
  if (/^\s/.test(text)) {
    return [text]
  }
  if (text.length <= charLimit) {
    return [text]
  }

  const lines: string[] = []
  let remaining = text

  while (remaining.length > charLimit) {
    let breakIndex = remaining.lastIndexOf(' ', charLimit)
    if (breakIndex <= 0) {
      breakIndex = charLimit
    }

    lines.push(remaining.slice(0, breakIndex))
    remaining = remaining.slice(breakIndex)
    if (remaining.startsWith(' ')) {
      remaining = remaining.slice(1)
    }
  }

  lines.push(remaining)
  return lines
}

function getColors(theme: string) {
  const isDark = theme === 'dark'
  return {
    bgColor: isDark ? '#0d1117' : '#ffffff',
    textColor: isDark ? '#c9d1d9' : '#24292f',
    authorColor: isDark ? '#8b949e' : '#57606a',
    hostedByColor: isDark ? '#7d8590' : '#6e7781',
    borderColor: isDark ? '#30363d' : '#d0d7de',
    accentColor: isDark ? '#58a6ff' : '#0969da'
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
}

export type CommentSvgProps = {
  comment: Comment
  theme?: string
  width?: string
  hostedBy?: string
  hostedByUrl?: string
}

function buildStyleBlock(colors: ReturnType<typeof getColors>): string {
  return `<![CDATA[
@import url('${googleFontsUrl}');
.comment-line {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 16px;
  fill: ${colors.textColor};
}
.author-line {
  font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  fill: ${colors.authorColor};
}
.hosted-by-line {
  font-family: 'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  fill: ${colors.hostedByColor};
}
]]>`
}

export function renderCommentSvg({
  comment,
  theme = 'light',
  width,
  hostedBy,
  hostedByUrl
}: CommentSvgProps): string {
  const colors = getColors(theme)

  const parsedWidth = parseInt(String(width ?? SVG_DEFAULT_WIDTH), 10)
  const numericWidth = Number.isNaN(parsedWidth) ? parseInt(SVG_DEFAULT_WIDTH, 10) : parsedWidth
  const widthAttribute = Number.isNaN(parsedWidth) ? SVG_DEFAULT_WIDTH : String(width ?? SVG_DEFAULT_WIDTH)
  const availableWidthForText = numericWidth - (2 * padding)
  const dynamicMaxCharsPerLine = Math.max(1, Math.floor(availableWidthForText / estimatedCharWidth))

  const wrappedLines: string[] = []
  comment.content.split('\n').forEach(line => {
    wrapText(line, dynamicMaxCharsPerLine).forEach(wrappedLine => wrappedLines.push(wrappedLine))
  })

  const height = Math.max(140, (wrappedLines.length * lineHeight) + (padding * 3.5))
  const resolvedHostedBy = hostedBy ?? process.env.HOSTED_BY ?? undefined
  const resolvedHostedByUrl = hostedByUrl ?? (resolvedHostedBy
    ? (process.env.HOSTED_BY_URL || `https://${resolvedHostedBy}`)
    : undefined)

  const commentLines = wrappedLines.map((line, index) => {
    const y = padding + ((index + 1) * lineHeight)
    return `<text x="${padding}" y="${y}" class="comment-line" xml:space="preserve">${escapeHtml(line)}</text>`
  }).join('\n      ')

  const authorText = `<text x="${padding}" y="${height - padding}" class="author-line">— ${escapeHtml(comment.author)}</text>`

  const authorBlock = comment.source
    ? `<a href="${escapeAttribute(comment.source)}" target="_blank">${authorText}</a>`
    : authorText

  const hostedByBlock = resolvedHostedBy && resolvedHostedByUrl
    ? `<a href="${escapeAttribute(resolvedHostedByUrl)}" target="_blank"><text x="${numericWidth - padding}" y="${height - padding}" text-anchor="end" class="hosted-by-line">${escapeHtml(resolvedHostedBy)}</text></a>`
    : ''

  return `<svg width="${escapeAttribute(widthAttribute)}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style type="text/css">${buildStyleBlock(colors)}</style>
    </defs>
    <rect width="100%" height="100%" fill="${colors.bgColor}" />
    <rect x="1" y="1" width="${numericWidth - 2}" height="${height - 2}" fill="none" stroke="${colors.borderColor}" stroke-width="2" rx="6" />
    <rect x="0" y="0" width="4" height="${height}" fill="${colors.accentColor}" />
    ${commentLines}
    ${authorBlock}
    ${hostedByBlock}
  </svg>`
}
