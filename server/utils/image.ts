import { unlink, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { originalsDir, thumbsDir, toProjectRelative } from './paths'

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function extensionForMime(type: string) {
  return MIME_EXTENSIONS[type]
}

export async function saveAssetImage(id: string, data: Buffer, mimeType: string) {
  const extension = extensionForMime(mimeType)
  if (!extension)
    throw new Error('仅支持 JPEG、PNG 或 WebP 图片')

  const image = sharp(data, { failOn: 'error' })
  const metadata = await image.metadata()
  if (!metadata.width || !metadata.height)
    throw new Error('无法读取图片尺寸')

  const originalPath = `${originalsDir}/${id}.${extension}`
  const thumbPath = `${thumbsDir}/${id}.jpg`
  const writtenPaths: string[] = []

  try {
    await writeFile(originalPath, data)
    writtenPaths.push(originalPath)
    await sharp(data)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(thumbPath)
    writtenPaths.push(thumbPath)

    return {
      imagePath: toProjectRelative(originalPath),
      thumbPath: toProjectRelative(thumbPath),
      width: metadata.width,
      height: metadata.height,
      cleanup: () => Promise.allSettled(writtenPaths.map(path => unlink(path))),
    }
  }
  catch (error) {
    await Promise.allSettled([...writtenPaths, originalPath, thumbPath].map(path => unlink(path)))
    throw error
  }
}
