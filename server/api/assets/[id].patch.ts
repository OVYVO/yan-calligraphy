import { and, eq, isNull } from 'drizzle-orm'
import { updateAssetSchema } from '../../../shared/schemas/asset'
import { characterAssets } from '../../database/schema'
import { toAssetDto } from '../../utils/assets'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 404, message: '素材不存在' })

  const parsed = updateAssetSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '素材信息不合法' })

  const existing = db.select().from(characterAssets)
    .where(and(eq(characterAssets.id, id), isNull(characterAssets.deletedAt)))
    .get()
  if (!existing)
    throw createError({ statusCode: 404, message: '素材不存在或已删除' })

  const input = parsed.data
  const changes = {
    ...(input.char !== undefined && { char: input.char }),
    ...(input.style !== undefined && { style: input.style }),
    ...(input.source !== undefined && { source: input.source || null }),
    ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
    ...(input.note !== undefined && { note: input.note || null }),
    updatedAt: new Date().toISOString(),
  }

  db.update(characterAssets).set(changes).where(eq(characterAssets.id, id)).run()
  const updated = db.select().from(characterAssets).where(eq(characterAssets.id, id)).get()!
  return toAssetDto(updated)
})
