import { randomUUID } from 'node:crypto'
import { createCompositionSchema } from '../../../shared/schemas/composition'
import { compositions } from '../../database/schema'
import { serializeCompositionFields, toCompositionDto } from '../../utils/compositions'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const parsed = createCompositionSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '作品信息不合法' })

  const input = parsed.data
  const now = new Date().toISOString()
  const serialized = serializeCompositionFields({
    layoutConfig: input.layoutConfig,
    items: input.items,
  })

  const row = {
    id: randomUUID(),
    title: input.title,
    text: input.text,
    layoutType: input.layoutType,
    layoutConfig: serialized.layoutConfig,
    items: serialized.items,
    exportPath: null,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(compositions).values(row).run()
  setResponseStatus(event, 201)
  return await toCompositionDto(row)
})
