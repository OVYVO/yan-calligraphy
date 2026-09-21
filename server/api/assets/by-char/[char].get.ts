import { and, desc, eq, isNull } from 'drizzle-orm'
import { characterAssets } from '../../../database/schema'
import { toAssetDto } from '../../../utils/assets'
import { db } from '../../../utils/db'

export default defineEventHandler((event) => {
  const char = getRouterParam(event, 'char')
  if (!char || Array.from(char).length !== 1 || !/^\p{Script=Han}$/u.test(char))
    throw createError({ statusCode: 400, message: '请提供一个汉字' })

  return db.select()
    .from(characterAssets)
    .where(and(eq(characterAssets.char, char), isNull(characterAssets.deletedAt)))
    .orderBy(desc(characterAssets.createdAt))
    .all()
    .map(toAssetDto)
})
