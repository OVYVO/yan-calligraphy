import { eq } from 'drizzle-orm'
import { compositions } from '../../database/schema'
import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 404, message: '作品不存在' })

  const result = db.delete(compositions).where(eq(compositions.id, id)).run()
  if (result.changes === 0)
    throw createError({ statusCode: 404, message: '作品不存在' })

  setResponseStatus(event, 204)
  return null
})
