import type {
  SplitCommitResponse,
  SplitDefaults,
  SplitPreviewResponse,
  SplitRegion,
  SplitRegionGeometry,
  SplitSessionDto,
} from '~~/shared/schemas/split'
import { commitSplitSchema, splitPreviewSchema } from '~~/shared/schemas/split'

function requestError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
      return data.message
  }
  return error instanceof Error ? error.message : fallback
}

export function useSplitSession() {
  let previewToken = 0
  const session = ref<SplitSessionDto | null>(null)
  const regions = ref<SplitRegion[]>([])
  const selectedRegionId = ref<string | null>(null)
  const defaults = ref<SplitDefaults>({
    style: '其他',
    source: '',
    tags: ['切分入库'],
  })
  const previewUrl = ref('')
  const uploading = ref(false)
  const previewing = ref(false)
  const committing = ref(false)

  const selectedRegion = computed(() =>
    regions.value.find(region => region.id === selectedRegionId.value) ?? null,
  )

  async function create(file: File) {
    uploading.value = true
    try {
      const body = new FormData()
      body.append('file', file)
      session.value = await $fetch<SplitSessionDto>('/api/split/sessions', {
        method: 'POST',
        body,
      })
      regions.value = []
      selectedRegionId.value = null
      previewUrl.value = ''
      return session.value
    }
    catch (error) {
      throw new Error(requestError(error, '图片上传失败'))
    }
    finally {
      uploading.value = false
    }
  }

  async function load(id: string) {
    uploading.value = true
    try {
      session.value = await $fetch<SplitSessionDto>(`/api/split/sessions/${id}`)
      regions.value = []
      selectedRegionId.value = null
      previewUrl.value = ''
      return session.value
    }
    catch (error) {
      throw new Error(requestError(error, '切分会话加载失败'))
    }
    finally {
      uploading.value = false
    }
  }

  function addRegion(geometry: Omit<SplitRegionGeometry, 'id' | 'matte'>) {
    const region: SplitRegion = {
      id: crypto.randomUUID(),
      ...geometry,
      char: '',
      matte: true,
    }
    regions.value.push(region)
    selectedRegionId.value = region.id
    previewUrl.value = ''
    return region
  }

  function updateRegion(id: string, partial: Partial<SplitRegion>) {
    const index = regions.value.findIndex(region => region.id === id)
    const current = regions.value[index]
    if (index < 0 || !current)
      return
    regions.value[index] = { ...current, ...partial }
    if (selectedRegionId.value === id && (
      'x' in partial
      || 'y' in partial
      || 'width' in partial
      || 'height' in partial
      || 'matte' in partial
    )) {
      previewUrl.value = ''
    }
  }

  function removeRegion(id: string) {
    const index = regions.value.findIndex(region => region.id === id)
    if (index < 0)
      return
    regions.value.splice(index, 1)
    if (selectedRegionId.value === id) {
      selectedRegionId.value = regions.value[index]?.id
        ?? regions.value[index - 1]?.id
        ?? null
      previewUrl.value = ''
    }
  }

  async function preview() {
    const currentSession = session.value
    const region = selectedRegion.value
    if (!currentSession || !region)
      throw new Error('请先选择一个文字区域')

    const parsed = splitPreviewSchema.safeParse(region)
    if (!parsed.success)
      throw new Error(parsed.error.issues[0]?.message ?? '文字区域不合法')

    const token = ++previewToken
    previewing.value = true
    try {
      const response = await $fetch<SplitPreviewResponse>(
        `/api/split/sessions/${currentSession.id}/preview`,
        { method: 'POST', body: parsed.data },
      )
      if (token === previewToken && selectedRegionId.value === region.id)
        previewUrl.value = response.previewUrl
      return response
    }
    catch (error) {
      throw new Error(requestError(error, '生成预览失败'))
    }
    finally {
      if (token === previewToken)
        previewing.value = false
    }
  }

  async function commit() {
    const currentSession = session.value
    if (!currentSession)
      throw new Error('切分会话不存在')

    const parsed = commitSplitSchema.safeParse({
      defaults: defaults.value,
      regions: regions.value,
    })
    if (!parsed.success)
      throw new Error(parsed.error.issues[0]?.message ?? '入库信息不完整')

    for (const region of parsed.data.regions) {
      if (
        region.x + region.width > currentSession.width
        || region.y + region.height > currentSession.height
      ) {
        throw new Error(`区域「${region.char}」超出图片范围`)
      }
    }

    committing.value = true
    try {
      return await $fetch<SplitCommitResponse>(
        `/api/split/sessions/${currentSession.id}/commit`,
        { method: 'POST', body: parsed.data },
      )
    }
    catch (error) {
      throw new Error(requestError(error, '批量入库失败'))
    }
    finally {
      committing.value = false
    }
  }

  async function discard() {
    if (session.value) {
      await $fetch(`/api/split/sessions/${session.value.id}`, {
        method: 'DELETE',
      }).catch(() => undefined)
    }
    session.value = null
    regions.value = []
    selectedRegionId.value = null
    previewUrl.value = ''
  }

  return {
    session,
    regions,
    selectedRegionId,
    selectedRegion,
    defaults,
    previewUrl,
    uploading,
    previewing,
    committing,
    create,
    load,
    addRegion,
    updateRegion,
    removeRegion,
    preview,
    commit,
    discard,
  }
}
