import type { Comment } from './types'

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

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, m => map[m]!)
}

export function generateCommentSvg(comment: Comment, theme: string = 'light', width: string = '800'): string {
  const bgColor = theme === 'dark' ? '#0d1117' : '#ffffff'
  const textColor = theme === 'dark' ? '#c9d1d9' : '#24292f'
  const authorColor = theme === 'dark' ? '#8b949e' : '#57606a'
  const borderColor = theme === 'dark' ? '#30363d' : '#d0d7de'
  const accentColor = theme === 'dark' ? '#58a6ff' : '#0969da'

  const lines = comment.content.split('\n')
  const lineHeight = 24
  const padding = 32
  const height = Math.max(200, (lines.length * lineHeight) + (padding * 3) + 40)

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <rect x="1" y="1" width="${parseInt(width) - 2}" height="${height - 2}" 
            fill="none" stroke="${borderColor}" stroke-width="2" rx="6"/>
      <rect x="0" y="0" width="4" height="${height}" fill="${accentColor}"/>
      
      ${lines.map((line, i) => 
        `<text x="${padding}" y="${padding + (i + 1) * lineHeight}" 
               fill="${textColor}" font-family="ui-monospace, monospace" font-size="16">
          ${escapeHtml(line)}
        </text>`
      ).join('')}
      
      <text x="${padding}" y="${height - padding}" fill="${authorColor}" 
            font-family="system-ui, sans-serif" font-size="14">
        — ${escapeHtml(comment.author)}
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