import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { splitPreviewSchema } from '../../../../../shared/schemas/split'
import { assertRegionInsideImage, extractRegionMatte } from '../../../../utils/matte'
import {
  readSplitSession,
  splitPreviewPath,
  splitPreviewUrl,
} from '../../../../utils/split-session'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: '缺少会话 ID' })

  const parsed = splitPreviewSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '文字区域不合法',
    })
  }

  const session = await readSplitSession(id)
  try {
    assertRegionInsideImage(parsed.data, session.dto.width, session.dto.height)
    const output = await extractRegionMatte(session.sourcePath, parsed.data)
    const previewPath = splitPreviewPath(id, parsed.data.id)
    await mkdir(dirname(previewPath), { recursive: true })
    await writeFile(previewPath, output)
    return {
      previewUrl: `${splitPreviewUrl(id, parsed.data.id)}?t=${Date.now()}`,
    }
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : '生成预览失败',
    })
  }
})
