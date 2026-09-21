import type { CompositionItemDto } from '../schemas/composition'
import type { LayoutConfig } from './defaults'

export interface DrawCompositionState {
  items: CompositionItemDto[]
  layoutConfig: LayoutConfig
  canvasWidth: number
  canvasHeight: number
  selectedIndex?: number | null
  images: Map<string, CanvasImageSource>
}

function getImageSize(image: CanvasImageSource) {
  if (image instanceof HTMLImageElement)
    return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }
  if (image instanceof HTMLCanvasElement || image instanceof OffscreenCanvas || image instanceof ImageBitmap)
    return { width: image.width, height: image.height }
  if (image instanceof HTMLVideoElement)
    return { width: image.videoWidth || image.width, height: image.videoHeight || image.height }
  return { width: 1, height: 1 }
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  size: number,
) {
  const { width, height } = getImageSize(image)
  const scale = Math.min(size / Math.max(width, 1), size / Math.max(height, 1))
  const drawWidth = width * scale
  const drawHeight = height * scale
  const offsetX = x + (size - drawWidth) / 2
  const offsetY = y + (size - drawHeight) / 2
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)
}

export function drawComposition(
  ctx: CanvasRenderingContext2D,
  state: DrawCompositionState,
  scale = 1,
) {
  const { items, layoutConfig, canvasWidth, canvasHeight, selectedIndex = null, images } = state

  ctx.save()
  ctx.scale(scale, scale)
  ctx.fillStyle = layoutConfig.background
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  items.forEach((item, index) => {
    const size = layoutConfig.cellSize * (item.scale || 1)
    const image = item.assetId ? images.get(item.assetId) : undefined

    if (image) {
      drawContainedImage(ctx, image, item.x, item.y, size)
    }
    else {
      ctx.strokeStyle = '#d94841'
      ctx.lineWidth = 2
      ctx.strokeRect(item.x + 1, item.y + 1, size - 2, size - 2)
      ctx.fillStyle = '#d94841'
      ctx.font = `${Math.floor(size * 0.42)}px "Songti SC", "SimSun", serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.char, item.x + size / 2, item.y + size / 2)
    }

    if (selectedIndex === index) {
      ctx.strokeStyle = '#18a058'
      ctx.lineWidth = 3
      ctx.strokeRect(item.x + 1.5, item.y + 1.5, size - 3, size - 3)
    }
  })

  ctx.restore()
}

export function hitTestCompositionItem(
  items: CompositionItemDto[],
  layoutConfig: LayoutConfig,
  x: number,
  y: number,
) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]!
    const size = layoutConfig.cellSize * (item.scale || 1)
    if (x >= item.x && x <= item.x + size && y >= item.y && y <= item.y + size)
      return index
  }
  return null
}
