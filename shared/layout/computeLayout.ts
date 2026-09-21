import type { LayoutConfig, LayoutType } from './defaults'

export interface LayoutPlacement {
  char: string
  x: number
  y: number
  size: number
}

export interface LayoutResult {
  width: number
  height: number
  items: LayoutPlacement[]
}

function verticalLayout(chars: string[], config: LayoutConfig): LayoutResult {
  const { cellSize, lineGap, padding } = config
  const items = chars.map((char, index) => ({
    char,
    x: padding,
    y: padding + index * (cellSize + lineGap),
    size: cellSize,
  }))

  return {
    width: padding * 2 + cellSize,
    height: padding * 2 + Math.max(chars.length, 1) * cellSize + Math.max(chars.length - 1, 0) * lineGap,
    items,
  }
}

function horizontalLayout(chars: string[], config: LayoutConfig): LayoutResult {
  const { cellSize, gap, lineGap, padding } = config
  const columns = Math.max(1, Math.min(8, chars.length || 1))
  const items = chars.map((char, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      char,
      x: padding + col * (cellSize + gap),
      y: padding + row * (cellSize + lineGap),
      size: cellSize,
    }
  })
  const rows = Math.max(1, Math.ceil(chars.length / columns))
  const usedColumns = Math.min(columns, Math.max(chars.length, 1))

  return {
    width: padding * 2 + usedColumns * cellSize + Math.max(usedColumns - 1, 0) * gap,
    height: padding * 2 + rows * cellSize + Math.max(rows - 1, 0) * lineGap,
    items,
  }
}

function gridLayout(chars: string[], config: LayoutConfig): LayoutResult {
  const { cellSize, gap, padding, columns } = config
  const cols = Math.max(1, columns)
  const items = chars.map((char, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return {
      char,
      x: padding + col * (cellSize + gap),
      y: padding + row * (cellSize + gap),
      size: cellSize,
    }
  })
  const rows = Math.max(1, Math.ceil(chars.length / cols))
  const usedColumns = Math.min(cols, Math.max(chars.length, 1))

  return {
    width: padding * 2 + usedColumns * cellSize + Math.max(usedColumns - 1, 0) * gap,
    height: padding * 2 + rows * cellSize + Math.max(rows - 1, 0) * gap,
    items,
  }
}

export function computeLayout(
  chars: string[],
  layoutType: LayoutType,
  config: LayoutConfig,
): LayoutResult {
  switch (layoutType) {
    case 'vertical':
      return verticalLayout(chars, config)
    case 'horizontal':
      return horizontalLayout(chars, config)
    case 'grid':
      return gridLayout(chars, config)
    default:
      return verticalLayout(chars, config)
  }
}
