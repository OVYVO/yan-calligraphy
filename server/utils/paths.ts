import { mkdirSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'

export const projectRoot = process.cwd()
export const uploadsRoot = resolve(projectRoot, 'uploads')
export const originalsDir = resolve(uploadsRoot, 'originals')
export const thumbsDir = resolve(uploadsRoot, 'thumbs')
export const exportsDir = resolve(uploadsRoot, 'exports')
export const sessionsDir = resolve(uploadsRoot, '_sessions')

for (const directory of [originalsDir, thumbsDir, exportsDir, sessionsDir])
  mkdirSync(directory, { recursive: true })

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function assertValidSessionId(sessionId: string) {
  if (!UUID_PATTERN.test(sessionId))
    throw new Error('非法会话 ID')
  return sessionId
}

export function getSessionDir(sessionId: string) {
  return resolve(sessionsDir, assertValidSessionId(sessionId))
}

export function toProjectRelative(absolutePath: string) {
  return relative(projectRoot, absolutePath).split(sep).join('/')
}

export function safeUploadPath(relativePath: string) {
  if (!relativePath || isAbsolute(relativePath) || relativePath.includes('\0'))
    throw new Error('非法媒体路径')

  const normalized = relativePath.replaceAll('\\', '/')
  const segments = normalized.split('/')
  if (segments.some(segment => !segment || segment === '.' || segment === '..'))
    throw new Error('非法媒体路径')

  if (!['originals', 'thumbs', 'exports', '_sessions'].includes(segments[0]!))
    throw new Error('不允许访问该目录')

  const target = resolve(uploadsRoot, ...segments)
  const relativeTarget = relative(uploadsRoot, target)
  if (relativeTarget.startsWith('..') || isAbsolute(relativeTarget))
    throw new Error('媒体路径越界')

  return target
}

export function assertRealPathInsideUploads(filePath: string) {
  const realRoot = realpathSync(uploadsRoot)
  const realFile = realpathSync(filePath)
  const relativeFile = relative(realRoot, realFile)
  if (relativeFile.startsWith('..') || isAbsolute(relativeFile))
    throw new Error('媒体路径越界')
  return realFile
}
