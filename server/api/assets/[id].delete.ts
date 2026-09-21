import { and, eq, isNull } from 'drizzle-orm'
import { characterAssets } from '../../database/schema'
import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 404, message: '素材不存在' })

  const result = db.update(characterAssets)
    .set({
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(characterAssets.id, id), isNull(characterAssets.deletedAt)))
    .run()

  if (result.changes === 0)
    throw createError({ statusCode: 404, message: '素材不存在或已删除' })

  setResponseStatus(event, 204)
  return null
})
