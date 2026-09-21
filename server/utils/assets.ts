import type { CharacterAsset } from '../database/schema'
import type { AssetDto, AssetStyle } from '../../shared/schemas/asset'

function parseTags(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : []
  }
  catch {
    return []
  }
}

export function toAssetDto(asset: CharacterAsset): AssetDto {
  return {
    id: asset.id,
    char: asset.char,
    imagePath: asset.imagePath,
    thumbPath: asset.thumbPath,
    imageUrl: `/media/${asset.imagePath.replace(/^uploads\//, '')}`,
    thumbUrl: `/media/${asset.thumbPath.replace(/^uploads\//, '')}`,
    style: asset.style as AssetStyle,
    source: asset.source,
    tags: parseTags(asset.tags),
    width: asset.width,
    height: asset.height,
    note: asset.note,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  }
}

export function errorMessage(error: unknown, fallback = '请求处理失败') {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
      return data.message
  }
  return error instanceof Error ? error.message : fallback
}
