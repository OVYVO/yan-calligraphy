import { readSplitSession } from '../../../../utils/split-session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: '缺少会话 ID' })

  return (await readSplitSession(id)).dto
})
