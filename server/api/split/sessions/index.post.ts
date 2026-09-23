import { randomUUID } from 'node:crypto'
import { createSplitSession } from '../../../utils/split-session'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts)
    throw createError({ statusCode: 400, message: '请使用 multipart/form-data 上传' })

  const files = parts.filter(part => part.name === 'file' && part.filename)
  if (files.length !== 1)
    throw createError({ statusCode: 400, message: '每次必须上传一张图片' })

  const file = files[0]!
  try {
    const session = await createSplitSession({
      id: randomUUID(),
      data: Buffer.from(file.data),
      mimeType: file.type ?? '',
      fileName: file.filename!,
    })
    setResponseStatus(event, 201)
    return session
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : '创建切分会话失败',
    })
  }
})
