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
