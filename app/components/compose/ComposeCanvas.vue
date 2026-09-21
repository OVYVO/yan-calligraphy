<script setup lang="ts">
import type { CompositionItemDto } from '~~/shared/schemas/composition'
import type { LayoutConfig } from '~~/shared/layout/defaults'
import { computeLayout } from '~~/shared/layout/computeLayout'
import { drawComposition, hitTestCompositionItem } from '~~/shared/layout/drawComposition'

const props = defineProps<{
  items: CompositionItemDto[]
  layoutType: 'vertical' | 'horizontal' | 'grid'
  layoutConfig: LayoutConfig
  assetsMap: Map<string, string>
  selectedIndex: number | null
}>()

const emit = defineEmits<{
  'update:selectedIndex': [index: number]
}>()

const shellRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageCache = new Map<string, HTMLImageElement>()
const displayScale = ref(1)
let drawToken = 0

const logicalSize = computed(() => {
  const layout = computeLayout(
    props.items.map(item => item.char),
    props.layoutType,
    props.layoutConfig,
  )
  return { width: layout.width, height: layout.height }
})

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

function onClick(event: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas)
    return
  const rect = canvas.getBoundingClientRect()
  const x = (event.clientX - rect.left) / displayScale.value
  const y = (event.clientY - rect.top) / displayScale.value
  const index = hitTestCompositionItem(props.items, props.layoutConfig, x, y)
  if (index !== null)
    emit('update:selectedIndex', index)
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
    <canvas ref="canvasRef" class="compose-canvas" @click="onClick" />
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
  padding: 16px;
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
  cursor: pointer;
  box-shadow: 0 8px 24px rgb(31 26 20 / 8%);
}
</style>
