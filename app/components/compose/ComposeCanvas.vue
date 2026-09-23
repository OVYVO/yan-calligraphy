<script setup lang="ts">
import type { CompositionItemDto } from '~~/shared/schemas/composition'
import type { LayoutConfig, LayoutType } from '~~/shared/layout/defaults'
import { resolveCanvasSize } from '~~/shared/layout/bounds'
import { drawComposition, hitTestCompositionItem } from '~~/shared/layout/drawComposition'

const props = defineProps<{
  items: CompositionItemDto[]
  layoutType: LayoutType
  layoutConfig: LayoutConfig
  assetsMap: Map<string, string>
  selectedIndex: number | null
}>()

const emit = defineEmits<{
  'update:selectedIndex': [index: number]
  'update:item-position': [index: number, x: number, y: number]
}>()

const shellRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageCache = new Map<string, HTMLImageElement>()
const displayScale = ref(1)
const dragging = ref(false)
let drawToken = 0

const dragState = {
  active: false,
  index: -1,
  moved: false,
  startPointerX: 0,
  startPointerY: 0,
  originX: 0,
  originY: 0,
}

const logicalSize = computed(() => resolveCanvasSize(
  props.items.map(item => item.char),
  props.layoutType,
  props.layoutConfig,
  props.items,
))

async function loadImage(url: string) {
  const cached = imageCache.get(url)
  if (cached)
    return cached

  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode().catch(() => new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片加载失败'))
  }))
  imageCache.set(url, image)
  return image
}

function pointerToLogic(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas)
    return null
  const rect = canvas.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) / displayScale.value,
    y: (event.clientY - rect.top) / displayScale.value,
  }
}

async function draw() {
  const canvas = canvasRef.value
  const shell = shellRef.value
  if (!canvas || !shell)
    return

  const token = ++drawToken
  const { width, height } = logicalSize.value
  const styles = getComputedStyle(shell)
  const padX = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0)
  const padY = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0)
  const availWidth = Math.max(shell.clientWidth - padX, 80)
  const availHeight = Math.max(shell.clientHeight - padY, 80)
  displayScale.value = Math.min(availWidth / Math.max(width, 1), availHeight / Math.max(height, 1))

  const dpr = window.devicePixelRatio || 1
  const cssWidth = width * displayScale.value
  const cssHeight = height * displayScale.value
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`
  canvas.width = Math.round(cssWidth * dpr)
  canvas.height = Math.round(cssHeight * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)

  const images = new Map<string, CanvasImageSource>()
  await Promise.all([...props.assetsMap.entries()].map(async ([assetId, url]) => {
    try {
      images.set(assetId, await loadImage(url))
    }
    catch {
      // Missing image falls back to missing-char rendering.
    }
  }))

  if (token !== drawToken)
    return

  drawComposition(ctx, {
    items: props.items,
    layoutConfig: props.layoutConfig,
    canvasWidth: width,
    canvasHeight: height,
    selectedIndex: props.selectedIndex,
    images,
  }, displayScale.value)
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0)
    return
  const point = pointerToLogic(event)
  if (!point)
    return

  const index = hitTestCompositionItem(props.items, props.layoutConfig, point.x, point.y)
  if (index === null)
    return

  const item = props.items[index]
  if (!item)
    return

  emit('update:selectedIndex', index)
  dragState.active = true
  dragState.index = index
  dragState.moved = false
  dragState.startPointerX = event.clientX
  dragState.startPointerY = event.clientY
  dragState.originX = item.x
  dragState.originY = item.y
  dragging.value = true
  canvasRef.value?.setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onPointerMove(event: PointerEvent) {
  if (!dragState.active)
    return

  const dx = (event.clientX - dragState.startPointerX) / displayScale.value
  const dy = (event.clientY - dragState.startPointerY) / displayScale.value
  if (!dragState.moved && Math.hypot(dx, dy) < 2)
    return

  dragState.moved = true
  emit(
    'update:item-position',
    dragState.index,
    dragState.originX + dx,
    dragState.originY + dy,
  )
}

function endDrag(event: PointerEvent) {
  if (!dragState.active)
    return
  dragState.active = false
  dragging.value = false
  try {
    canvasRef.value?.releasePointerCapture(event.pointerId)
  }
  catch {
    // ignore if capture already released
  }
}

watch(
  () => [props.items, props.layoutConfig, props.layoutType, props.selectedIndex, props.assetsMap] as const,
  () => {
    void nextTick(() => draw())
  },
  { deep: true },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  void nextTick(() => draw())
  window.addEventListener('resize', draw)

  if (shellRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      void draw()
    })
    resizeObserver.observe(shellRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', draw)
  resizeObserver?.disconnect()
  resizeObserver = null
})

defineExpose({
  async exportPng(filename: string) {
    const { width, height } = logicalSize.value
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = width * 2
    exportCanvas.height = height * 2
    const ctx = exportCanvas.getContext('2d')
    if (!ctx)
      throw new Error('无法创建导出画布')

    const images = new Map<string, CanvasImageSource>()
    await Promise.all([...props.assetsMap.entries()].map(async ([assetId, url]) => {
      images.set(assetId, await loadImage(url))
    }))

    drawComposition(ctx, {
      items: props.items,
      layoutConfig: props.layoutConfig,
      canvasWidth: width,
      canvasHeight: height,
      selectedIndex: null,
      images,
    }, 2)

    await new Promise<void>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('导出失败'))
          return
        }
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename.endsWith('.png') ? filename : `${filename}.png`
        anchor.click()
        URL.revokeObjectURL(url)
        resolve()
      }, 'image/png')
    })
  },
})
</script>

<template>
  <div ref="shellRef" class="canvas-shell">
    <canvas
      ref="canvasRef"
      class="compose-canvas"
      :class="{ dragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    />
  </div>
</template>

<style scoped>
.canvas-shell {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
  background:
    linear-gradient(45deg, #ece7de 25%, transparent 25%) 0 0 / 16px 16px,
    linear-gradient(-45deg, #ece7de 25%, transparent 25%) 0 8px / 16px 16px,
    #f4efe6;
  border: 1px solid #e4ddd2;
  border-radius: 8px;
  box-sizing: border-box;
}

.compose-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 8px 24px rgb(31 26 20 / 8%);
}

.compose-canvas.dragging {
  cursor: grabbing;
}
</style>
