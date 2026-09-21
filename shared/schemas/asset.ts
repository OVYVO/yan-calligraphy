import { z } from 'zod'

export const ASSET_STYLES = ['楷', '行', '草', '隶', '篆', '其他'] as const

export const assetStyleSchema = z.enum(ASSET_STYLES)

const charSchema = z.string()
  .trim()
  .refine(value => Array.from(value).length === 1 && /^\p{Script=Han}$/u.test(value), {
    message: '汉字必须恰好为一个汉字字符',
  })

const tagsSchema = z.array(z.string()).transform(tags => [
  ...new Set(tags.map(tag => tag.trim()).filter(Boolean)),
])

export const createAssetSchema = z.object({
  char: charSchema,
  style: assetStyleSchema.default('其他'),
  source: z.string().trim().max(200, '来源不能超过 200 个字符').optional(),
  tags: tagsSchema.default([]),
  note: z.string().trim().max(2000, '备注不能超过 2000 个字符').optional(),
})

export const updateAssetSchema = createAssetSchema.partial()

export const assetListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  char: z.string().trim().optional(),
  style: assetStyleSchema.optional(),
  tag: z.string().trim().optional(),
})

export type AssetStyle = typeof ASSET_STYLES[number]
export type CreateAssetInput = z.infer<typeof createAssetSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>

export interface AssetDto {
  id: string
  char: string
  imagePath: string
  thumbPath: string
  imageUrl: string
  thumbUrl: string
  style: AssetStyle
  source: string | null
  tags: string[]
  width: number
  height: number
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface AssetListResponse {
  items: AssetDto[]
  total: number
  page: number
  pageSize: number
}
