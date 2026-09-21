import type { CreateAssetInput } from '../../shared/schemas/asset'
import { createAssetSchema } from '../../shared/schemas/asset'

function fieldText(data: Uint8Array) {
  return Buffer.from(data).toString('utf8')
}

function parseTags(values: string[]) {
  if (!values.length)
    return []

  if (values.length === 1) {
    try {
      const parsed: unknown = JSON.parse(values[0]!)
      if (Array.isArray(parsed))
        return parsed
    }
    catch {
      // A single plain value is also accepted.
    }
  }
  return values
}

export async function readAssetMultipart(event: Parameters<typeof readMultipartFormData>[0]) {
  const parts = await readMultipartFormData(event)
  if (!parts)
    throw createError({ statusCode: 400, message: '请使用 multipart/form-data 上传' })

  const fileParts = parts.filter(part => part.name === 'file' && part.filename)
  if (fileParts.length !== 1)
    throw createError({ statusCode: 400, message: '每次请求必须上传一张图片' })

  const fields = new Map<string, string[]>()
  for (const part of parts) {
    if (!part.name || part.name === 'file')
      continue
    const values = fields.get(part.name) ?? []
    values.push(fieldText(part.data))
    fields.set(part.name, values)
  }

  const parsed = createAssetSchema.safeParse({
    char: fields.get('char')?.[0],
    style: fields.get('style')?.[0] || undefined,
    source: fields.get('source')?.[0] || undefined,
    tags: parseTags(fields.get('tags') ?? []),
    note: fields.get('note')?.[0] || undefined,
  })

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '素材信息不合法',
    })
  }

  const file = fileParts[0]!
  return {
    file: {
      data: Buffer.from(file.data),
      type: file.type ?? '',
      filename: file.filename!,
    },
    input: parsed.data satisfies CreateAssetInput,
  }
}
