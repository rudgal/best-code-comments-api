import { raw } from 'hono/utils/html'
import type { Comment } from '../types.js'
import { SVG_DEFAULT_WIDTH } from '../utils.js'

const lineHeight = 24
const padding = 32
const estimatedCharWidth = 9.4
const googleFontsUrl = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Roboto:wght@400;500&display=swap'

const buildStyleBlock = (colors: ReturnType<typeof getColors>) => {
  return raw(String.raw`<![CDATA[
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
]]>`)
}

function wrapText(text: string, charLimit: number): string[] {
  if (text.length === 0) {
    return ['']
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

export type CommentSvgProps = {
  comment: Comment
  theme?: string
  width?: string
  hostedBy?: string
  hostedByUrl?: string
}

export const CommentSvg = ({
  comment,
  theme = 'light',
  width,
  hostedBy,
  hostedByUrl
}: CommentSvgProps) => {
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

  const authorText = (
    <text x={padding} y={height - padding} class="author-line">
      — {comment.author}
    </text>
  )

  return (
    <svg width={widthAttribute} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style type="text/css">{buildStyleBlock(colors)}</style>
      </defs>
      <rect width="100%" height="100%" fill={colors.bgColor} />
      <rect
        x="1"
        y="1"
        width={numericWidth - 2}
        height={height - 2}
        fill="none"
        stroke={colors.borderColor}
        strokeWidth={2}
        rx="6"
      />
      <rect x="0" y="0" width="4" height={height} fill={colors.accentColor} />

      {wrappedLines.map((line, i) => (
        <text
          key={`comment-line-${i}`}
          x={padding}
          y={padding + ((i + 1) * lineHeight)}
          class="comment-line"
          {...{ 'xml:space': 'preserve' }}
        >
          {line}
        </text>
      ))}
      {comment.source ? (
        <a href={comment.source} target="_blank">
          {authorText}
        </a>
      ) : (
        authorText
      )}

      {resolvedHostedBy && resolvedHostedByUrl ? (
        <a href={resolvedHostedByUrl} target="_blank">
          <text
            x={numericWidth - padding}
            y={height - padding}
            textAnchor="end"
            class="hosted-by-line"
          >
            {resolvedHostedBy}
          </text>
        </a>
      ) : null}
    </svg>
  )
}
