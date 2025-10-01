export const COMMENT_TAGS = [
  'humor',        // punch lines, sarcasm, jokes
  'warning',      // hands-off notices or perilous caveats
  'hack',         // confessed shortcuts and ugly workarounds
  'todo',         // TODO/FIXME style follow-up reminders
  'ascii-art',    // formatting-as-message (e.g. code art/diagrams)
  'dedication',   // shout-outs, thanks, tributes
  'meta',         // commentary about coding or maintainers themselves
  'pop-culture',  // memes, lyrics, movies, pop references
  'profane',      // salty language or swears
  'story',        // anecdotal or narrative comments
] as const;

export type CommentTag = typeof COMMENT_TAGS[number];

export interface Comment {
  id: number
  author: string
  date: string
  source: string | null
  popularity: number;
  tags: CommentTag[]
  content: string
}
