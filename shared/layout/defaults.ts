export const LAYOUT_TYPES = ['vertical', 'horizontal', 'grid'] as const

export type LayoutType = typeof LAYOUT_TYPES[number]

export interface LayoutConfig {
  cellSize: number
  gap: number
  lineGap: number
  padding: number
  columns: number
  background: string
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  cellSize: 160,
  gap: 16,
  lineGap: 24,
  padding: 48,
  columns: 4,
  background: '#f7f3eb',
}

export const LAYOUT_TYPE_LABELS: Record<LayoutType, string> = {
  vertical: '竖排',
  horizontal: '横排',
  grid: '宫格',
}
