import { z } from 'zod'
import { DEFAULT_LAYOUT_CONFIG, LAYOUT_TYPES } from '../layout/defaults'

export const layoutTypeSchema = z.enum(LAYOUT_TYPES)

export const layoutConfigSchema = z.object({
  cellSize: z.number().int().min(40).max(640).default(DEFAULT_LAYOUT_CONFIG.cellSize),
  gap: z.number().int().min(0).max(200).default(DEFAULT_LAYOUT_CONFIG.gap),
  lineGap: z.number().int().min(0).max(200).default(DEFAULT_LAYOUT_CONFIG.lineGap),
  padding: z.number().int().min(0).max(400).default(DEFAULT_LAYOUT_CONFIG.padding),
  columns: z.number().int().min(1).max(12).default(DEFAULT_LAYOUT_CONFIG.columns),
  background: z.string().min(1).default(DEFAULT_LAYOUT_CONFIG.background),
})

export const compositionItemSchema = z.object({
  char: z.string().refine(value => Array.from(value).length === 1 && /^\p{Script=Han}$/u.test(value), {
    message: '作品项必须是单个汉字',
  }),
  assetId: z.string().uuid().nullable(),
  x: z.number(),
  y: z.number(),
  scale: z.number().default(1),
  rotate: z.number().default(0),
})

export const createCompositionSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题不能超过 100 个字符'),
  text: z.string().trim().min(1, '文案不能为空').max(2000, '文案不能超过 2000 个字符'),
  layoutType: layoutTypeSchema.default('vertical'),
  layoutConfig: layoutConfigSchema.default(DEFAULT_LAYOUT_CONFIG),
  items: z.array(compositionItemSchema).min(1, '至少需要一个汉字'),
})

export const updateCompositionSchema = createCompositionSchema.partial()

export const compositionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CompositionItem = z.infer<typeof compositionItemSchema>
export type CreateCompositionInput = z.infer<typeof createCompositionSchema>
export type UpdateCompositionInput = z.infer<typeof updateCompositionSchema>

export interface CompositionAssetSummary {
  id: string
  char: string
  thumbUrl: string
  imageUrl: string
  style: string
}

export interface CompositionItemDto extends CompositionItem {
  asset?: CompositionAssetSummary | null
}

export interface CompositionDto {
  id: string
  title: string
  text: string
  layoutType: z.infer<typeof layoutTypeSchema>
  layoutConfig: z.infer<typeof layoutConfigSchema>
  items: CompositionItemDto[]
  exportPath: string | null
  createdAt: string
  updatedAt: string
}

export interface CompositionSummaryDto {
  id: string
  title: string
  text: string
  layoutType: z.infer<typeof layoutTypeSchema>
  updatedAt: string
  createdAt: string
}

export interface CompositionListResponse {
  items: CompositionSummaryDto[]
  total: number
  page: number
  pageSize: number
}
