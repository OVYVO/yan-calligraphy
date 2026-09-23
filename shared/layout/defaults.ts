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

export const BACKGROUND_PRESETS = [
  { label: '浅宣', value: '#f7f3eb' },
  { label: '米黄', value: '#f3e6c8' },
  { label: '雪白', value: '#ffffff' },
  { label: '淡青', value: '#eef3ef' },
  { label: '墨底', value: '#2b2926' },
] as const
