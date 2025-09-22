export interface Comment {
  id: number
  author: string
  date: string
  source: string | null
  popularity: number;
  tags: string[]
  content: string
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
