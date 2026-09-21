import { useMessage } from 'naive-ui'
import type { AssetDto } from '~~/shared/schemas/asset'
import type {
  CompositionDto,
  CompositionItemDto,
  CreateCompositionInput,
} from '~~/shared/schemas/composition'
import type { LayoutConfig, LayoutType } from '~~/shared/layout/defaults'
import { DEFAULT_LAYOUT_CONFIG } from '~~/shared/layout/defaults'
import { computeLayout } from '~~/shared/layout/computeLayout'
import { splitText } from '~~/shared/layout/splitText'

function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
      return data.message
  }
  return error instanceof Error ? error.message : fallback
}

async function pickAssetIds(chars: string[]) {
  const cache = new Map<string, string | null>()
  await Promise.all([...new Set(chars)].map(async (char) => {
    const assets = await $fetch<AssetDto[]>(`/api/assets/by-char/${encodeURIComponent(char)}`)
    cache.set(char, assets[0]?.id ?? null)
  }))
  return cache
}

function mergeLayoutItems(
  chars: string[],
  layoutType: LayoutType,
  layoutConfig: LayoutConfig,
  previousItems: CompositionItemDto[] = [],
) {
  const previousByIndex = previousItems
  const layout = computeLayout(chars, layoutType, layoutConfig)

  return {
    canvas: layout,
    items: layout.items.map((placement, index) => {
      const previous = previousByIndex[index]
      const matched = previous?.char === placement.char
        ? previous
        : previousItems.find(item => item.char === placement.char && item.assetId)
      return {
        char: placement.char,
        assetId: matched?.assetId ?? null,
        x: placement.x,
        y: placement.y,
        scale: 1,
        rotate: 0,
        asset: matched?.asset ?? null,
      } satisfies CompositionItemDto
    }),
  }
}

export async function createCompositionFromText(input: {
  title: string
  text: string
  layoutType?: LayoutType
}) {
  const chars = splitText(input.text)
  if (!chars.length)
    throw new Error('文案中没有可集的汉字（空白与标点会被忽略）')

  const layoutType = input.layoutType ?? 'vertical'
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG }
  const assetIds = await pickAssetIds(chars)
  const layout = computeLayout(chars, layoutType, layoutConfig)
  const body: CreateCompositionInput = {
    title: input.title.trim() || chars.slice(0, 8).join(''),
    text: input.text.trim(),
    layoutType,
    layoutConfig,
    items: layout.items.map(placement => ({
      char: placement.char,
      assetId: assetIds.get(placement.char) ?? null,
      x: placement.x,
      y: placement.y,
      scale: 1,
      rotate: 0,
    })),
  }

  return await $fetch<CompositionDto>('/api/compositions', {
    method: 'POST',
    body,
  })
}

export function useCompositionEditor(compositionId: MaybeRefOrGetter<string>) {
  const message = useMessage()
  const composition = ref<CompositionDto | null>(null)
  const title = ref('')
  const text = ref('')
  const layoutType = ref<LayoutType>('vertical')
  const layoutConfig = ref<LayoutConfig>({ ...DEFAULT_LAYOUT_CONFIG })
  const items = ref<CompositionItemDto[]>([])
  const selectedIndex = ref(0)
  const loading = ref(true)
  const saving = ref(false)
  const canvasSize = ref({ width: 320, height: 480 })

  const selectedItem = computed(() => items.value[selectedIndex.value] ?? null)
  const assetsMap = computed(() => {
    const map = new Map<string, string>()
    for (const item of items.value) {
      if (item.assetId && item.asset?.imageUrl)
        map.set(item.assetId, item.asset.imageUrl)
    }
    return map
  })

  function applyLayout(nextType = layoutType.value, nextConfig = layoutConfig.value) {
    const chars = items.value.map(item => item.char)
    const merged = mergeLayoutItems(chars, nextType, nextConfig, items.value)
    layoutType.value = nextType
    layoutConfig.value = { ...nextConfig }
    items.value = merged.items
    canvasSize.value = {
      width: merged.canvas.width,
      height: merged.canvas.height,
    }
  }

  async function load() {
    loading.value = true
    try {
      const id = toValue(compositionId)
      const data = await $fetch<CompositionDto>(`/api/compositions/${id}`)
      composition.value = data
      title.value = data.title
      text.value = data.text
      layoutType.value = data.layoutType
      layoutConfig.value = { ...data.layoutConfig }
      items.value = data.items
      selectedIndex.value = 0
      const layout = computeLayout(
        data.items.map(item => item.char),
        data.layoutType,
        data.layoutConfig,
      )
      canvasSize.value = { width: layout.width, height: layout.height }
    }
    catch (error) {
      message.error(getErrorMessage(error, '作品加载失败'))
      composition.value = null
    }
    finally {
      loading.value = false
    }
  }

  function selectIndex(index: number) {
    if (index >= 0 && index < items.value.length)
      selectedIndex.value = index
  }

  function setLayoutType(next: LayoutType) {
    applyLayout(next, layoutConfig.value)
  }

  function assignAsset(asset: AssetDto) {
    const current = items.value[selectedIndex.value]
    if (!current)
      return
    items.value[selectedIndex.value] = {
      ...current,
      assetId: asset.id,
      asset: {
        id: asset.id,
        char: asset.char,
        thumbUrl: asset.thumbUrl,
        imageUrl: asset.imageUrl,
        style: asset.style,
      },
    }
  }

  async function rebuildFromText() {
    const chars = splitText(text.value)
    if (!chars.length) {
      message.warning('文案中没有可集的汉字')
      return
    }

    const previous = items.value
    const assetIds = await pickAssetIds(chars)
    const layout = computeLayout(chars, layoutType.value, layoutConfig.value)
    items.value = layout.items.map((placement, index) => {
      const kept = previous.find((item, itemIndex) => item.char === placement.char && (
        itemIndex === index || item.assetId
      ))
      const assetId = kept?.assetId ?? assetIds.get(placement.char) ?? null
      return {
        char: placement.char,
        assetId,
        x: placement.x,
        y: placement.y,
        scale: 1,
        rotate: 0,
        asset: kept?.char === placement.char ? kept.asset : null,
      }
    })
    canvasSize.value = { width: layout.width, height: layout.height }
    selectedIndex.value = 0
  }

  async function save() {
    saving.value = true
    try {
      const id = toValue(compositionId)
      const updated = await $fetch<CompositionDto>(`/api/compositions/${id}`, {
        method: 'PATCH',
        body: {
          title: title.value.trim(),
          text: text.value.trim(),
          layoutType: layoutType.value,
          layoutConfig: layoutConfig.value,
          items: items.value.map(({ char, assetId, x, y, scale, rotate }) => ({
            char,
            assetId,
            x,
            y,
            scale,
            rotate,
          })),
        },
      })
      composition.value = updated
      items.value = updated.items
      message.success('作品已保存')
    }
    catch (error) {
      message.error(getErrorMessage(error, '保存失败'))
    }
    finally {
      saving.value = false
    }
  }

  watch(() => toValue(compositionId), () => {
    void load()
  }, { immediate: true })

  return {
    composition,
    title,
    text,
    layoutType,
    layoutConfig,
    items,
    selectedIndex,
    selectedItem,
    assetsMap,
    canvasSize,
    loading,
    saving,
    load,
    selectIndex,
    setLayoutType,
    assignAsset,
    rebuildFromText,
    save,
    getErrorMessage,
  }
}
