import { randomUUID } from 'node:crypto'
import { characterAssets } from '../../database/schema'
import { readAssetMultipart } from '../../utils/asset-input'
import { toAssetDto } from '../../utils/assets'
import { db } from '../../utils/db'
import { saveAssetImage } from '../../utils/image'

export default defineEventHandler(async (event) => {
  const { file, input } = await readAssetMultipart(event)
  const id = randomUUID()
  let savedImage: Awaited<ReturnType<typeof saveAssetImage>> | undefined

  try {
    savedImage = await saveAssetImage(id, file.data, file.type)
    const now = new Date().toISOString()
    const asset = {
      id,
      char: input.char,
      imagePath: savedImage.imagePath,
      thumbPath: savedImage.thumbPath,
      style: input.style,
      source: input.source || null,
      tags: JSON.stringify(input.tags),
      width: savedImage.width,
      height: savedImage.height,
      note: input.note || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    db.insert(characterAssets).values(asset).run()
    setResponseStatus(event, 201)
    return toAssetDto(asset)
  }
  catch (error) {
    await savedImage?.cleanup()
    if (error && typeof error === 'object' && 'statusCode' in error)
      throw error
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : '素材上传失败',
    })
  }
})
