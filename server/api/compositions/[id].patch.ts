import { eq } from 'drizzle-orm'
import { updateCompositionSchema } from '../../../shared/schemas/composition'
import { compositions } from '../../database/schema'
import { serializeCompositionFields, toCompositionDto } from '../../utils/compositions'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 404, message: '作品不存在' })

  const existing = db.select().from(compositions).where(eq(compositions.id, id)).get()
  if (!existing)
    throw createError({ statusCode: 404, message: '作品不存在' })

  const parsed = updateCompositionSchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: parsed.error.issues[0]?.message ?? '作品信息不合法' })

  const input = parsed.data
  const changes: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  }

  if (input.title !== undefined)
    changes.title = input.title
  if (input.text !== undefined)
    changes.text = input.text
  if (input.layoutType !== undefined)
    changes.layoutType = input.layoutType
  if (input.layoutConfig !== undefined || input.items !== undefined) {
    const serialized = serializeCompositionFields({
      layoutConfig: input.layoutConfig ?? JSON.parse(existing.layoutConfig),
      items: input.items ?? JSON.parse(existing.items),
    })
    if (input.layoutConfig !== undefined)
      changes.layoutConfig = serialized.layoutConfig
    if (input.items !== undefined)
      changes.items = serialized.items
  }

  db.update(compositions).set(changes).where(eq(compositions.id, id)).run()
  const updated = db.select().from(compositions).where(eq(compositions.id, id)).get()!
  return await toCompositionDto(updated)
})
