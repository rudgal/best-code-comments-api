import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { execFile } from 'child_process'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.join(__dirname, '..')

const rawIds = process.env.GIF_COMMENT_IDS ?? '4,7,8,10,11,18,29,33,34,38,43,45,60,64,93,99,194,196,202'
const COMMENT_IDS = rawIds
  .split(',')
  .map(id => parseInt(id.trim(), 10))
  .filter(id => !Number.isNaN(id))
const BASE_URL = process.env.COMMENTS_BASE_URL ?? 'http://localhost:3000'
const OUTPUT_GIF = process.env.OUTPUT_GIF ?? path.join(repoRoot, 'docs', 'sample-comments.gif')
const TMP_DIR = path.join(repoRoot, 'docs', '_gif-frames')
const PADDED_DIR = path.join(TMP_DIR, 'padded')
const BACKGROUND = process.env.GIF_BACKGROUND ?? '#0d1117'
const CANVAS_WIDTH_OVERRIDE = process.env.GIF_WIDTH ? parseInt(process.env.GIF_WIDTH, 10) : undefined
const CANVAS_HEIGHT_OVERRIDE = process.env.GIF_HEIGHT ? parseInt(process.env.GIF_HEIGHT, 10) : undefined
const FRAME_DELAY = process.env.GIF_DELAY ?? ('' + 60 * 9)
const THEME = process.env.GIF_THEME ?? 'light'
const PADDING = parseInt(process.env.GIF_PADDING ?? '24', 10)

async function ensureDirectories() {
  await rm(TMP_DIR, { recursive: true, force: true })
  await mkdir(PADDED_DIR, { recursive: true })
  const outputDir = path.dirname(OUTPUT_GIF)
  await mkdir(outputDir, { recursive: true })
}

type FrameInfo = {
  path: string
  width: number
  height: number
}

async function downloadFrame(id: number, index: number): Promise<FrameInfo> {
  const url = `${BASE_URL}/comment.png?id=${id}&theme=${THEME}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  const metadata = await sharp(buffer).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  const fileName = `frame-${String(index + 1).padStart(2, '0')}-id-${id}.png`
  const framePath = path.join(TMP_DIR, fileName)
  await writeFile(framePath, buffer)
  return { path: framePath, width, height }
}

async function padFrame(originalPath: string, width: number, height: number) {
  const paddedPath = path.join(PADDED_DIR, path.basename(originalPath))
  const background = BACKGROUND.toLowerCase() === 'transparent' ? 'none' : BACKGROUND
  const args = [
    originalPath,
    '-background', background,
    '-gravity', 'center',
    '-extent', `${width}x${height}`
  ]

  if (background === 'none') {
    args.push('-alpha', 'set')
  } else {
    args.push('-alpha', 'remove', '-alpha', 'off')
  }

  args.push(paddedPath)

  await execFileAsync('magick', args)
  return paddedPath
}

async function buildGif(paddedFrames: string[]) {
  if (paddedFrames.length === 0) {
    throw new Error('No frames available to create GIF')
  }

  await execFileAsync('magick', [
    '-delay', FRAME_DELAY,
    '-loop', '0',
    ...paddedFrames,
    OUTPUT_GIF
  ])
}

async function main() {
  if (!process.env.MAGICK_HOME) {
    // noop – just ensures top-level await compiles
  }

  await ensureDirectories()

  const frameInfos: FrameInfo[] = []
  for (let i = 0; i < COMMENT_IDS.length; i += 1) {
    const id = COMMENT_IDS[i]
    console.log(`Fetching comment ${id}...`)
    const info = await downloadFrame(id, i)
    frameInfos.push(info)
  }

  const maxWidth = CANVAS_WIDTH_OVERRIDE ?? Math.max(...frameInfos.map(info => info.width), 0)
  const maxHeight = CANVAS_HEIGHT_OVERRIDE ?? Math.max(...frameInfos.map(info => info.height), 0)

  if (maxWidth === 0 || maxHeight === 0) {
    throw new Error('Unable to determine canvas size from frames. Ensure at least one comment rendered correctly.')
  }

  const baseWidth = CANVAS_WIDTH_OVERRIDE ?? maxWidth
  const baseHeight = CANVAS_HEIGHT_OVERRIDE ?? maxHeight
  const targetWidth = baseWidth + (CANVAS_WIDTH_OVERRIDE ? 0 : PADDING * 2)
  const targetHeight = baseHeight + (CANVAS_HEIGHT_OVERRIDE ? 0 : PADDING * 2)

  const paddedFrames: string[] = []
  for (const info of frameInfos) {
    console.log(`Padding ${path.basename(info.path)}...`)
    paddedFrames.push(await padFrame(info.path, targetWidth, targetHeight))
  }

  console.log('Assembling GIF...')
  await buildGif(paddedFrames)
  console.log(`GIF created at ${OUTPUT_GIF}`)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
