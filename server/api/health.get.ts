import { sql } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '../utils/db'

export default defineEventHandler(() => {
  try {
    db.run(sql`select 1`)

    return {
      ok: true,
      db: true,
      sharp: sharp.versions?.sharp ?? 'loaded',
    }
  }
  catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误'
    throw createError({
      statusCode: 500,
      statusMessage: '健康检查失败',
      message: `数据库不可用：${reason}`,
    })
  }
})
