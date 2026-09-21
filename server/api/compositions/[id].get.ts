import { eq } from 'drizzle-orm'
import { compositions } from '../../database/schema'
import { toCompositionDto } from '../../utils/compositions'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const row = id
    ? db.select().from(compositions).where(eq(compositions.id, id)).get()
    : undefined

  if (!row)
    throw createError({ statusCode: 404, message: '作品不存在' })

  return await toCompositionDto(row)
})
