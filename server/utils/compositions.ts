import { inArray } from 'drizzle-orm'
import type { Composition } from '../database/schema'
import { characterAssets } from '../database/schema'
import type {
  CompositionAssetSummary,
  CompositionDto,
  CompositionItem,
  CompositionItemDto,
  CompositionSummaryDto,
} from '../../shared/schemas/composition'
import type { LayoutConfig, LayoutType } from '../../shared/layout/defaults'
import { toAssetDto } from './assets'
import { db } from './db'

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  }
  catch {
    return fallback
  }
}

async function loadAssetSummaries(assetIds: string[]) {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))]
  if (!uniqueIds.length)
    return new Map<string, CompositionAssetSummary>()

  const rows = db.select()
    .from(characterAssets)
    .where(inArray(characterAssets.id, uniqueIds))
    .all()

  return new Map(rows.map((row) => {
    const dto = toAssetDto(row)
    return [dto.id, {
      id: dto.id,
      char: dto.char,
      thumbUrl: dto.thumbUrl,
      imageUrl: dto.imageUrl,
      style: dto.style,
    } satisfies CompositionAssetSummary]
  }))
}

export async function toCompositionDto(row: Composition): Promise<CompositionDto> {
  const items = parseJson<CompositionItem[]>(row.items, [])
  const layoutConfig = parseJson<LayoutConfig>(row.layoutConfig, {
    cellSize: 160,
    gap: 16,
    lineGap: 24,
    padding: 48,
    columns: 4,
    background: '#f7f3eb',
  })
  const assets = await loadAssetSummaries(
    items.map(item => item.assetId).filter((id): id is string => Boolean(id)),
  )

  const itemDtos: CompositionItemDto[] = items.map(item => ({
    ...item,
    asset: item.assetId ? assets.get(item.assetId) ?? null : null,
  }))

  return {
    id: row.id,
    title: row.title,
    text: row.text,
    layoutType: row.layoutType as LayoutType,
    layoutConfig,
    items: itemDtos,
    exportPath: row.exportPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function toCompositionSummary(row: Composition): CompositionSummaryDto {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    layoutType: row.layoutType as LayoutType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeCompositionFields(input: {
  layoutConfig: LayoutConfig
  items: CompositionItem[]
}) {
  return {
    layoutConfig: JSON.stringify(input.layoutConfig),
    items: JSON.stringify(input.items.map(({ char, assetId, x, y, scale, rotate }) => ({
      char,
      assetId,
      x,
      y,
      scale,
      rotate,
    }))),
  }
}
