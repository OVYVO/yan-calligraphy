import { deleteSplitSession } from '../../../../utils/split-session'
import { assertValidSessionId } from '../../../../utils/paths'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: '缺少会话 ID' })

  try {
    assertValidSessionId(id)
    await deleteSplitSession(id)
    setResponseStatus(event, 204)
    return null
  }
  catch {
    throw createError({ statusCode: 400, message: '非法会话 ID' })
  }
})
