<script setup lang="ts">
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import {
  Image as VImage,
  Layer as VLayer,
  Rect as VRect,
  Stage as VStage,
  Transformer as VTransformer,
  useImage,
} from 'vue-konva'
import type { VueKonvaRef } from 'vue-konva'
import type { SplitRegion } from '~~/shared/schemas/split'
import { MIN_SPLIT_REGION_SIZE } from '~~/shared/schemas/split'

const props = defineProps<{
  imageUrl: string
  imageWidth: number
  imageHeight: number
  regions: SplitRegion[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  add: [geometry: { x: number, y: number, width: number, height: number }]
  select: [id: string]
  update: [id: string, partial: Partial<SplitRegion>]
  remove: [id: string]
  invalid: [message: string]
}>()

type ToolMode = 'select' | 'draw' | 'pan'

const shellRef = ref<HTMLElement | null>(null)
const stageRef = ref<VueKonvaRef<Konva.Stage> | null>(null)
const transformerRef = ref<VueKonvaRef<Konva.Transformer> | null>(null)
const regionRefs = new Map<string, VueKonvaRef<Konva.Rect>>()
const spaceHeld = ref(false)
const ctrlHeld = ref(false)
const drawing = ref(false)
const stageSize = ref({ width: 800, height: 600 })
const stageScale = ref(1)
const stagePosition = ref({ x: 0, y: 0 })
const draft = ref<{ x: number, y: number, width: number, height: number } | null>(null)
const drawStart = ref<{ x: number, y: number } | null>(null)
const [image] = useImage(() => props.imageUrl)

const mode = computed<ToolMode>(() => {
  if (drawing.value)
    return 'draw'
  if (spaceHeld.value)
    return 'pan'
  if (ctrlHeld.value)
    return 'draw'
  return 'select'
})

const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
  scaleX: stageScale.value,
  scaleY: stageScale.value,
  x: stagePosition.value.x,
  y: stagePosition.value.y,
  draggable: mode.value === 'pan',
}))

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
}

function fitImage() {
  const width = shellRef.value?.clientWidth ?? 800
  const height = shellRef.value?.clientHeight ?? 600
  stageSize.value = { width, height }
  const scale = Math.min(
    (width - 24) / props.imageWidth,
    (height - 24) / props.imageHeight,
    1,
  )
  stageScale.value = Math.max(scale, 0.05)
  stagePosition.value = {
    x: (width - props.imageWidth * stageScale.value) / 2,
    y: (height - props.imageHeight * stageScale.value) / 2,
  }
}

function resizeStage() {
  const shell = shellRef.value
  if (!shell)
    return
  stageSize.value = {
    width: shell.clientWidth,
    height: shell.clientHeight,
  }
}

function clientToImagePoint(clientX: number, clientY: number) {
  const stage = stageRef.value?.getNode()
  if (!stage)
    return null
  const rect = stage.container().getBoundingClientRect()
  const pointer = {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
  const transform = stage.getAbsoluteTransform().copy().invert()
  const point = transform.point(pointer)
  return {
    x: Math.max(0, Math.min(props.imageWidth, point.x)),
    y: Math.max(0, Math.min(props.imageHeight, point.y)),
  }
}

function applyNodeListening(next: ToolMode) {
  const stage = stageRef.value?.getNode()
  if (!stage)
    return
  stage.draggable(next === 'pan')
  for (const node of stage.find('Image'))
    node.listening(false)
  for (const [, regionRef] of regionRefs) {
    const node = regionRef.getNode()
    if (!node)
      continue
    node.listening(next === 'select')
    node.draggable(next === 'select')
  }
  const transformer = transformerRef.value?.getNode()
  transformer?.listening(next === 'select')
}

function detachDrawListeners() {
  window.removeEventListener('pointermove', onDrawPointerMove)
  window.removeEventListener('pointerup', onDrawPointerUp)
  window.removeEventListener('pointercancel', onDrawPointerUp)
}

function cancelDraft() {
  if (!drawing.value && !draft.value && !drawStart.value)
    return
  drawing.value = false
  drawStart.value = null
  draft.value = null
  detachDrawListeners()
  applyNodeListening(spaceHeld.value ? 'pan' : ctrlHeld.value ? 'draw' : 'select')
}

function finishDraft() {
  if (!drawing.value && !draft.value && !drawStart.value)
    return
  const finished = draft.value
  drawing.value = false
  drawStart.value = null
  draft.value = null
  detachDrawListeners()
  applyNodeListening(spaceHeld.value ? 'pan' : ctrlHeld.value ? 'draw' : 'select')
  if (!finished)
    return
  if (finished.width < MIN_SPLIT_REGION_SIZE || finished.height < MIN_SPLIT_REGION_SIZE) {
    emit('invalid', `文字框短边不能小于 ${MIN_SPLIT_REGION_SIZE}px`)
    return
  }
  emit('add', {
    x: Math.round(finished.x),
    y: Math.round(finished.y),
    width: Math.round(finished.width),
    height: Math.round(finished.height),
  })
}

function onDrawPointerMove(event: PointerEvent) {
  if (!drawing.value || !drawStart.value)
    return
  const point = clientToImagePoint(event.clientX, event.clientY)
  if (!point)
    return
  const start = drawStart.value
  draft.value = {
    x: Math.min(start.x, point.x),
    y: Math.min(start.y, point.y),
    width: Math.abs(point.x - start.x),
    height: Math.abs(point.y - start.y),
  }
}

function onDrawPointerUp() {
  finishDraft()
}

function onShellPointerDown(event: PointerEvent) {
  ctrlHeld.value = event.ctrlKey

  // 中键不处理；macOS 上 Ctrl+点击可能变成 button 2
  if (event.button === 1)
    return

  if (spaceHeld.value) {
    applyNodeListening('pan')
    return
  }

  if (!event.ctrlKey)
    return

  // 用原生事件框选，避免 preventDefault 打断 Konva 指针
  event.preventDefault()
  event.stopPropagation()

  const point = clientToImagePoint(event.clientX, event.clientY)
  if (!point)
    return

  applyNodeListening('draw')
  drawing.value = true
  drawStart.value = point
  draft.value = { ...point, width: 0, height: 0 }

  window.addEventListener('pointermove', onDrawPointerMove)
  window.addEventListener('pointerup', onDrawPointerUp)
  window.addEventListener('pointercancel', onDrawPointerUp)
}

function onShellContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

function onWheel(event: KonvaEventObject<WheelEvent>) {
  event.evt.preventDefault()
  const oldScale = stageScale.value
  const imageCenter = {
    x: props.imageWidth / 2,
    y: props.imageHeight / 2,
  }
  const centerOnScreen = {
    x: stagePosition.value.x + imageCenter.x * oldScale,
    y: stagePosition.value.y + imageCenter.y * oldScale,
  }
  const direction = event.evt.deltaY > 0 ? -1 : 1
  const nextScale = Math.max(0.05, Math.min(6, oldScale * (direction > 0 ? 1.12 : 1 / 1.12)))
  stageScale.value = nextScale
  stagePosition.value = {
    x: centerOnScreen.x - imageCenter.x * nextScale,
    y: centerOnScreen.y - imageCenter.y * nextScale,
  }
}

function onStageDragEnd(event: KonvaEventObject<DragEvent>) {
  const stage = stageRef.value?.getNode()
  if (!stage || event.target !== stage)
    return
  stagePosition.value = {
    x: event.target.x(),
    y: event.target.y(),
  }
}

function setRegionRef(id: string, value: unknown) {
  if (value)
    regionRefs.set(id, value as VueKonvaRef<Konva.Rect>)
  else
    regionRefs.delete(id)
}

function clampGeometry(region: SplitRegion, node: Konva.Rect) {
  const width = Math.max(MIN_SPLIT_REGION_SIZE, node.width() * node.scaleX())
  const height = Math.max(MIN_SPLIT_REGION_SIZE, node.height() * node.scaleY())
  node.scaleX(1)
  node.scaleY(1)
  return {
    x: Math.round(Math.max(0, Math.min(node.x(), props.imageWidth - width))),
    y: Math.round(Math.max(0, Math.min(node.y(), props.imageHeight - height))),
    width: Math.round(Math.min(width, props.imageWidth)),
    height: Math.round(Math.min(height, props.imageHeight)),
    id: region.id,
  }
}

function onRegionDragEnd(event: KonvaEventObject<DragEvent>) {
  const region = props.regions.find(item => item.id === event.target.id())
  if (!region)
    return
  const geometry = clampGeometry(region, event.target as Konva.Rect)
  emit('update', region.id, geometry)
}

function onRegionTransformEnd(event: KonvaEventObject<Event>) {
  const region = props.regions.find(item => item.id === event.target.id())
  if (!region)
    return
  const geometry = clampGeometry(region, event.target as Konva.Rect)
  emit('update', region.id, geometry)
}

function onKeydown(event: KeyboardEvent) {
  if (event.code === 'Space' && !isTypingTarget(event.target)) {
    if (!event.repeat) {
      spaceHeld.value = true
      if (!drawing.value)
        applyNodeListening('pan')
    }
    event.preventDefault()
    return
  }

  if (event.key === 'Control') {
    ctrlHeld.value = true
    if (!spaceHeld.value && !drawing.value)
      applyNodeListening('draw')
    return
  }

  if (event.key === 'Escape' || event.key === 'Delete' || event.key === 'Backspace') {
    if (isTypingTarget(event.target))
      return
    if (props.selectedId) {
      event.preventDefault()
      emit('remove', props.selectedId)
    }
  }
}

function onKeyup(event: KeyboardEvent) {
  if (event.code === 'Space') {
    spaceHeld.value = false
    if (!drawing.value)
      applyNodeListening(ctrlHeld.value ? 'draw' : 'select')
  }
  if (event.key === 'Control') {
    ctrlHeld.value = false
    if (!drawing.value)
      applyNodeListening(spaceHeld.value ? 'pan' : 'select')
  }
}

function onWindowBlur() {
  spaceHeld.value = false
  ctrlHeld.value = false
  cancelDraft()
  applyNodeListening('select')
}

watch(
  () => props.selectedId,
  async (id) => {
    await nextTick()
    const transformer = transformerRef.value?.getNode()
    if (!transformer)
      return
    const node = id ? regionRefs.get(id)?.getNode() : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  },
  { immediate: true },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  void nextTick(fitImage)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('blur', onWindowBlur)
  if (shellRef.value) {
    resizeObserver = new ResizeObserver(resizeStage)
    resizeObserver.observe(shellRef.value)
  }
})

onBeforeUnmount(() => {
  detachDrawListeners()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('blur', onWindowBlur)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="canvas-panel">
    <div class="canvas-toolbar">
      <NButton secondary @click="fitImage">
        适应画布
      </NButton>
      <span class="hint">Ctrl+拖拽框选 · 空格+拖拽平移 · 滚轮缩放 · Esc/Delete 删除</span>
    </div>

    <div
      ref="shellRef"
      class="stage-shell"
      :class="`mode-${mode}`"
      @pointerdown.capture="onShellPointerDown"
      @contextmenu.capture.prevent="onShellContextMenu"
    >
      <VStage
        ref="stageRef"
        :config="stageConfig"
        @wheel="onWheel"
        @dragend="onStageDragEnd"
      >
        <VLayer>
          <VImage
            :config="{
              image,
              x: 0,
              y: 0,
              width: imageWidth,
              height: imageHeight,
              listening: false,
            }"
          />
          <VRect
            v-for="region in regions"
            :key="region.id"
            :ref="value => setRegionRef(region.id, value)"
            :config="{
              id: region.id,
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
              stroke: selectedId === region.id ? '#18a058' : '#d94841',
              strokeWidth: 2 / stageScale,
              fill: 'rgba(24,160,88,0.08)',
              draggable: mode === 'select',
              listening: mode === 'select',
            }"
            @click="emit('select', region.id)"
            @tap="emit('select', region.id)"
            @dragend="onRegionDragEnd"
            @transformend="onRegionTransformEnd"
          />
          <VRect
            v-if="draft"
            :config="{
              ...draft,
              stroke: '#18a058',
              strokeWidth: 2 / stageScale,
              dash: [8 / stageScale, 4 / stageScale],
              fill: 'rgba(24,160,88,0.08)',
              listening: false,
            }"
          />
          <VTransformer
            ref="transformerRef"
            :config="{
              rotateEnabled: false,
              enabledAnchors: [
                'top-left', 'top-center', 'top-right',
                'middle-left', 'middle-right',
                'bottom-left', 'bottom-center', 'bottom-right',
              ],
              borderStroke: '#18a058',
              anchorStroke: '#18a058',
              anchorSize: 8 / stageScale,
              listening: mode === 'select',
            }"
          />
        </VLayer>
      </VStage>
    </div>
  </div>
</template>

<style scoped>
.canvas-panel {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.canvas-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.hint {
  color: #756d63;
  font-size: 12px;
}

.stage-shell {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #eeeae4;
}

.mode-draw {
  cursor: crosshair;
}

.mode-pan {
  cursor: grab;
}

.mode-pan:active {
  cursor: grabbing;
}

@media (max-width: 960px) {
  .stage-shell {
    min-height: 480px;
  }
}
</style>
