import { count, desc } from 'drizzle-orm'
import { compositionListQuerySchema } from '../../../shared/schemas/composition'
import { compositions } from '../../database/schema'
import { toCompositionSummary } from '../../utils/compositions'
import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const parsed = compositionListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '查询参数不合法' })

  const query = parsed.data
  const total = db.select({ total: count() }).from(compositions).get()?.total ?? 0
  const rows = db.select()
    .from(compositions)
    .orderBy(desc(compositions.updatedAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)
    .all()

  return {
    items: rows.map(toCompositionSummary),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
})
