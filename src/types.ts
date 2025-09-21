export interface Comment {
  id: number
  content: string
  author: string
  tags: string[]
  source: string | null
  dateAdded: string
}

export interface QueryParams {
  tags?: string
  author?: string
  limit?: string
  random?: string
  id?: string
  theme?: string
  width?: string
  interval?: string
}
