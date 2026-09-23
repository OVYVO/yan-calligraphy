import type { CompositionItemDto } from '../schemas/composition'
import type { LayoutConfig, LayoutType } from './defaults'
import { computeLayout } from './computeLayout'

export interface CanvasSize {
  width: number
  height: number
}

/** 根据已放置的 items 计算包围盒（含右边/下边 padding）。 */
export function itemsBounds(
  items: Array<Pick<CompositionItemDto, 'x' | 'y' | 'scale'>>,
  layoutConfig: LayoutConfig,
): CanvasSize {
  const { cellSize, padding } = layoutConfig
  if (!items.length) {
    return {
      width: padding * 2 + cellSize,
      height: padding * 2 + cellSize,
    }
  }

  let maxRight = 0
  let maxBottom = 0
  for (const item of items) {
    const size = cellSize * (item.scale || 1)
    maxRight = Math.max(maxRight, item.x + size)
    maxBottom = Math.max(maxBottom, item.y + size)
  }

  return {
    width: Math.ceil(maxRight + padding),
    height: Math.ceil(maxBottom + padding),
  }
}

/**
 * 画布逻辑尺寸：布局理论尺寸与 items 包围盒取较大值，
 * 保证未拖拽时与原先一致，拖出布局外时不被裁切。
 */
export function resolveCanvasSize(
  chars: string[],
  layoutType: LayoutType,
  layoutConfig: LayoutConfig,
  items: Array<Pick<CompositionItemDto, 'x' | 'y' | 'scale'>>,
): CanvasSize {
  const layout = computeLayout(chars, layoutType, layoutConfig)
  const bounds = itemsBounds(items, layoutConfig)
  return {
    width: Math.max(layout.width, bounds.width),
    height: Math.max(layout.height, bounds.height),
  }
}
