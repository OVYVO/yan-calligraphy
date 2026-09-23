import { commitSplitSchema } from '../../../../../shared/schemas/split'
import { commitSplitSession } from '../../../../utils/split-commit'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: '缺少会话 ID' })

  const parsed = commitSplitSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '入库信息不合法',
    })
  }

  try {
    return await commitSplitSession(id, parsed.data)
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error)
      throw error
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : '批量入库失败',
    })
  }
})
