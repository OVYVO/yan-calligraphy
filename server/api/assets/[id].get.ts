import { and, eq, isNull } from 'drizzle-orm'
import { characterAssets } from '../../database/schema'
import { toAssetDto } from '../../utils/assets'
import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  const asset = id
    ? db.select().from(characterAssets)
        .where(and(eq(characterAssets.id, id), isNull(characterAssets.deletedAt)))
        .get()
    : undefined

  if (!asset)
    throw createError({ statusCode: 404, message: '素材不存在或已删除' })

  return toAssetDto(asset)
})
