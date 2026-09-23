import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import sharp from 'sharp'
import type { SplitSessionDto } from '../../shared/schemas/split'
import { extensionForMime } from './image'
import { getSessionDir } from './paths'

const MAX_SPLIT_FILE_SIZE = 20 * 1024 * 1024
const META_FILE = 'meta.json'

interface SplitSessionMeta {
  id: string
  width: number
  height: number
  fileName: string
  mimeType: string
  sourceFile: string
  createdAt: string
}

function toDto(meta: SplitSessionMeta): SplitSessionDto {
  return {
    id: meta.id,
    width: meta.width,
    height: meta.height,
    fileName: meta.fileName,
    mimeType: meta.mimeType,
    imageUrl: `/media/_sessions/${meta.id}/${meta.sourceFile}`,
    createdAt: meta.createdAt,
  }
}

export async function createSplitSession(input: {
  id: string
  data: Buffer
  mimeType: string
  fileName: string
}) {
  const extension = extensionForMime(input.mimeType)
  if (!extension)
    throw new Error('仅支持 JPEG、PNG 或 WebP 图片')
  if (input.data.byteLength > MAX_SPLIT_FILE_SIZE)
    throw new Error('图片不能超过 20MB')

  const directory = getSessionDir(input.id)
  const sourceFile = `source.${extension}`
  const sourcePath = resolve(directory, sourceFile)

  await mkdir(directory, { recursive: false })
  try {
    const pipeline = sharp(input.data, { failOn: 'error' }).rotate()
    const normalized = extension === 'jpg'
      ? await pipeline.jpeg({ quality: 95 }).toBuffer()
      : extension === 'webp'
        ? await pipeline.webp({ quality: 95 }).toBuffer()
        : await pipeline.png().toBuffer()
    const metadata = await sharp(normalized).metadata()
    if (!metadata.width || !metadata.height)
      throw new Error('无法读取图片尺寸')

    const meta: SplitSessionMeta = {
      id: input.id,
      width: metadata.width,
      height: metadata.height,
      fileName: basename(input.fileName),
      mimeType: input.mimeType,
      sourceFile,
      createdAt: new Date().toISOString(),
    }
    await Promise.all([
      writeFile(sourcePath, normalized),
      writeFile(resolve(directory, META_FILE), JSON.stringify(meta)),
    ])
    return toDto(meta)
  }
  catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

export async function readSplitSession(sessionId: string) {
  try {
    const directory = getSessionDir(sessionId)
    const raw = await readFile(resolve(directory, META_FILE), 'utf8')
    const meta = JSON.parse(raw) as SplitSessionMeta
    if (meta.id !== sessionId || !meta.sourceFile)
      throw new Error('会话元数据损坏')
    return {
      dto: toDto(meta),
      sourcePath: resolve(directory, meta.sourceFile),
      directory,
    }
  }
  catch {
    throw createError({ statusCode: 404, message: '切分会话不存在或已过期' })
  }
}

export async function deleteSplitSession(sessionId: string) {
  await rm(getSessionDir(sessionId), { recursive: true, force: true })
}

export function splitPreviewPath(sessionId: string, regionId: string) {
  const safeRegionId = regionId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
  return resolve(getSessionDir(sessionId), 'preview', `${safeRegionId}.png`)
}

export function splitPreviewUrl(sessionId: string, regionId: string) {
  const safeRegionId = regionId.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
  return `/media/_sessions/${sessionId}/preview/${safeRegionId}.png`
}
