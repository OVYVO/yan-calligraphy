import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import { assetListQuerySchema } from '../../../shared/schemas/asset'
import { characterAssets } from '../../database/schema'
import { toAssetDto } from '../../utils/assets'
import { db } from '../../utils/db'

export default defineEventHandler((event) => {
  const parsed = assetListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '查询参数不合法' })

  const query = parsed.data
  const conditions = [isNull(characterAssets.deletedAt)]
  if (query.char)
    conditions.push(eq(characterAssets.char, query.char))
  if (query.style)
    conditions.push(eq(characterAssets.style, query.style))
  if (query.tag)
    conditions.push(sql`exists (select 1 from json_each(${characterAssets.tags}) where value = ${query.tag})`)

  const where = and(...conditions)
  const total = db.select({ total: count() }).from(characterAssets).where(where).get()?.total ?? 0
  const items = db.select()
    .from(characterAssets)
    .where(where)
    .orderBy(desc(characterAssets.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)
    .all()

  return {
    items: items.map(toAssetDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
})
