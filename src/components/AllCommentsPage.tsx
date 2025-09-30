import type { Comment } from '../types.js'
import { isCommentExcluded } from '../utils.js'
import { CommentSvg } from './CommentSvg.js'

export type AllCommentsPageProps = {
  comments: Comment[]
}

const styles = `
  body { font-family: sans-serif; margin: 2em; }
  ul { list-style-type: none; padding: 0; }
  li { margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 5px; }
  pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; white-space: pre-wrap; word-wrap: break-word; max-width: 100%; }
  code { font-family: monospace; }
`

export const AllCommentsPage = ({ comments }: AllCommentsPageProps) => (
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>All Comments</title>
      <style>{styles}</style>
    </head>
    <body>
      <h1>All Comments ({comments.length})</h1>
      <ul>
        {comments.map(comment => {
          const excluded = isCommentExcluded(comment)
          const paragraphStyle = excluded ? 'font-weight: bold;' : ''
          const listItemStyle = excluded ? 'background-color: #ff9f9f;' : ''
          return (
            <li style={listItemStyle} key={comment.id}>
              <p style={paragraphStyle}>
                <strong>ID:</strong> {comment.id}
              </p>
              <CommentSvg comment={comment} />
            </li>
          )
        })}
      </ul>
    </body>
  </html>
)
