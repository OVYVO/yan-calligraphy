import { z } from 'zod'
import { assetStyleSchema, charSchema, tagsSchema } from './asset'

export const MIN_SPLIT_REGION_SIZE = 24

export const splitRegionGeometrySchema = z.object({
  id: z.string().min(1, '区域 ID 不能为空').max(100),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(MIN_SPLIT_REGION_SIZE, `区域宽度不能小于 ${MIN_SPLIT_REGION_SIZE}px`),
  height: z.number().int().min(MIN_SPLIT_REGION_SIZE, `区域高度不能小于 ${MIN_SPLIT_REGION_SIZE}px`),
  matte: z.boolean().default(true),
})

export const splitRegionSchema = splitRegionGeometrySchema.extend({
  char: charSchema,
})

export const splitPreviewSchema = splitRegionGeometrySchema

export const splitDefaultsSchema = z.object({
  style: assetStyleSchema,
  source: z.string().trim().min(1, '来源不能为空').max(200, '来源不能超过 200 个字符'),
  tags: tagsSchema.default([]),
  note: z.string().trim().max(2000, '备注不能超过 2000 个字符').optional(),
})

export const commitSplitSchema = z.object({
  defaults: splitDefaultsSchema,
  regions: z.array(splitRegionSchema).min(1, '至少需要一个文字区域'),
})

export type SplitRegion = z.infer<typeof splitRegionSchema>
export type SplitRegionGeometry = z.infer<typeof splitRegionGeometrySchema>
export type SplitDefaults = z.infer<typeof splitDefaultsSchema>
export type CommitSplitInput = z.infer<typeof commitSplitSchema>

export interface SplitSessionDto {
  id: string
  width: number
  height: number
  imageUrl: string
  fileName: string
  mimeType: string
  createdAt: string
}

export interface SplitPreviewResponse {
  previewUrl: string
}

export interface SplitCommitSuccess {
  regionId: string
  assetId: string
  char: string
}

export interface SplitCommitFailure {
  regionId: string
  char?: string
  reason: string
}

export interface SplitCommitResponse {
  batchId: string
  succeeded: SplitCommitSuccess[]
  failed: SplitCommitFailure[]
}
