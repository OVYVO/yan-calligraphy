import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { assertRealPathInsideUploads, safeUploadPath } from '../../utils/paths'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export default defineEventHandler(async (event) => {
  const routePath = getRouterParam(event, 'path')
  if (!routePath)
    throw createError({ statusCode: 404, message: '媒体文件不存在' })

  try {
    const target = safeUploadPath(decodeURIComponent(routePath))
    const realFile = assertRealPathInsideUploads(target)
    const contentType = CONTENT_TYPES[extname(realFile).toLowerCase()]
    if (!contentType)
      throw createError({ statusCode: 404, message: '不支持的媒体类型' })

    setHeader(event, 'Content-Type', contentType)
    setHeader(
      event,
      'Cache-Control',
      routePath.startsWith('_sessions/')
        ? 'private, no-store'
        : 'public, max-age=86400',
    )
    return await readFile(realFile)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error)
      throw error
    throw createError({ statusCode: 404, message: '媒体文件不存在' })
  }
})
