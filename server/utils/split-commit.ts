import { randomUUID } from 'node:crypto'
import { unlink, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import type { CommitSplitInput, SplitCommitResponse } from '../../shared/schemas/split'
import { characterAssets } from '../database/schema'
import { db } from './db'
import { assertRegionInsideImage, extractRegionMatte } from './matte'
import { originalsDir, thumbsDir, toProjectRelative } from './paths'
import { deleteSplitSession, readSplitSession } from './split-session'

function errorReason(error: unknown) {
  return error instanceof Error ? error.message : '处理失败'
}

export async function commitSplitSession(
  sessionId: string,
  input: CommitSplitInput,
): Promise<SplitCommitResponse> {
  const session = await readSplitSession(sessionId)
  const response: SplitCommitResponse = {
    batchId: randomUUID(),
    succeeded: [],
    failed: [],
  }

  for (const region of input.regions) {
    const assetId = randomUUID()
    const originalPath = `${originalsDir}/${assetId}.png`
    const thumbPath = `${thumbsDir}/${assetId}.jpg`
    let originalWritten = false
    let thumbWritten = false

    try {
      assertRegionInsideImage(region, session.dto.width, session.dto.height)
      const image = await extractRegionMatte(session.sourcePath, region)
      await writeFile(originalPath, image)
      originalWritten = true
      await sharp(image)
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 84, mozjpeg: true })
        .toFile(thumbPath)
      thumbWritten = true

      const now = new Date().toISOString()
      const tags = [...new Set([
        ...input.defaults.tags,
        '切分入库',
        ...(!region.matte ? ['未去底'] : []),
      ])]
      db.insert(characterAssets).values({
        id: assetId,
        char: region.char,
        imagePath: toProjectRelative(originalPath),
        thumbPath: toProjectRelative(thumbPath),
        style: input.defaults.style,
        source: input.defaults.source || '多字切分',
        tags: JSON.stringify(tags),
        width: region.width,
        height: region.height,
        note: input.defaults.note || null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }).run()

      response.succeeded.push({
        regionId: region.id,
        assetId,
        char: region.char,
      })
    }
    catch (error) {
      if (originalWritten)
        await unlink(originalPath).catch(() => undefined)
      if (thumbWritten)
        await unlink(thumbPath).catch(() => undefined)
      response.failed.push({
        regionId: region.id,
        char: region.char,
        reason: errorReason(error),
      })
    }
  }

  if (response.succeeded.length)
    await deleteSplitSession(sessionId)

  return response
}
