<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui'
import type { SplitDefaults, SplitRegion } from '~~/shared/schemas/split'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const metadataVisible = ref(false)
const loadingSession = ref(true)
const {
  session,
  regions,
  selectedRegionId,
  selectedRegion,
  defaults,
  previewUrl,
  previewing,
  committing,
  load,
  addRegion,
  updateRegion,
  removeRegion,
  preview,
  commit,
  discard,
} = useSplitSession()

const regionsReady = computed(() => {
  return regions.value.length > 0 && regions.value.every(region =>
    Array.from(region.char.trim()).length === 1
    && /^\p{Script=Han}$/u.test(region.char.trim()),
  )
})

const metadataReady = computed(() =>
  Boolean(defaults.value.style && defaults.value.source?.trim()),
)

function onDefaultsChange(value: SplitDefaults) {
  defaults.value = value
}

function onRegionUpdate(id: string, partial: Partial<SplitRegion>) {
  updateRegion(id, partial)
  const region = regions.value.find(item => item.id === id)
  const shouldRefresh = region?.matte && selectedRegionId.value === id && (
    partial.matte === true
    || 'x' in partial
    || 'y' in partial
    || 'width' in partial
    || 'height' in partial
  )
  if (shouldRefresh)
    void nextTick(generatePreview)
}

function selectRegion(id: string) {
  if (selectedRegionId.value === id)
    return
  selectedRegionId.value = id
  previewUrl.value = ''
  const region = regions.value.find(item => item.id === id)
  if (region?.matte)
    void nextTick(generatePreview)
}

function onAddRegion(geometry: { x: number, y: number, width: number, height: number }) {
  addRegion(geometry)
  void nextTick(generatePreview)
}

async function generatePreview() {
  try {
    await preview()
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '生成预览失败')
  }
}

async function confirmCommit() {
  if (!metadataReady.value) {
    message.warning('请填写完整的批量元数据')
    return
  }
  try {
    const result = await commit()
    if (!result.succeeded.length) {
      const reasons = result.failed.map(item => `#${item.regionId}: ${item.reason}`).join('\n')
      dialog.error({
        title: '入库失败',
        content: reasons || '没有素材成功入库',
        positiveText: '知道了',
      })
      return
    }

    const failedText = result.failed.length
      ? `；${result.failed.length} 个失败：${result.failed.map(item => item.reason).join('、')}`
      : ''
    metadataVisible.value = false
    message.success(`已成功入库 ${result.succeeded.length} 个字${failedText}`)
    await router.push({ path: '/assets', query: { tag: '切分入库' } })
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '批量入库失败')
  }
}

function confirmDiscard() {
  if (!session.value) {
    void router.push('/assets')
    return
  }
  dialog.warning({
    title: '放弃本次切分',
    content: '当前标注不会保存，确定放弃吗？',
    positiveText: '放弃',
    negativeText: '继续编辑',
    async onPositiveClick() {
      await discard()
      await router.push('/assets')
    },
  })
}

onMounted(async () => {
  const id = route.query.id
  if (typeof id !== 'string' || !id) {
    loadingSession.value = false
    message.warning('请先上传多字图片')
    await router.replace('/assets')
    return
  }
  try {
    await load(id)
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '切分会话加载失败')
    await router.replace('/assets')
  }
  finally {
    loadingSession.value = false
  }
})
</script>

<template>
  <div class="split-page">
    <div class="page-header">
      <div>
        <NButton text @click="confirmDiscard">
          ← 返回素材库
        </NButton>
        <h1>多字入库</h1>
        <p>手动框选文字区域，去除纸色背景后批量入库</p>
      </div>
      <NSpace v-if="session" :size="12">
        <NButton @click="confirmDiscard">
          放弃
        </NButton>
        <NButton
          type="primary"
          :disabled="!regionsReady"
          @click="metadataVisible = true"
        >
          确认入库（{{ regions.length }}）
        </NButton>
      </NSpace>
    </div>

    <div v-if="loadingSession" class="loading-wrap">
      <NSpin size="medium">
        正在加载切分会话…
      </NSpin>
    </div>

    <div v-else-if="session" class="workspace">
      <SplitCanvas
        :image-url="session.imageUrl"
        :image-width="session.width"
        :image-height="session.height"
        :regions="regions"
        :selected-id="selectedRegionId"
        @add="onAddRegion"
        @select="selectRegion"
        @update="onRegionUpdate"
        @remove="removeRegion"
        @invalid="message.warning($event)"
      />

      <aside class="side-panel">
        <div class="regions-panel">
          <SplitRegionList
            :regions="regions"
            :selected-id="selectedRegionId"
            @select="selectRegion"
            @update="onRegionUpdate"
            @remove="removeRegion"
          />
        </div>
        <NCard size="small" class="preview-card">
          <SplitPreviewPane
            :preview-url="previewUrl"
            :loading="previewing"
            :has-selection="Boolean(selectedRegion)"
            :matte-enabled="Boolean(selectedRegion?.matte)"
          />
        </NCard>
      </aside>
    </div>

    <NModal v-model:show="metadataVisible" :mask-closable="!committing">
      <NCard
        class="metadata-modal"
        title="填写批量元数据"
        :bordered="false"
        closable
        @close="metadataVisible = false"
      >
        <SplitDefaultsForm
          :model-value="defaults"
          @update:model-value="onDefaultsChange"
        />
        <template #footer>
          <NSpace justify="end" :size="12">
            <NButton :disabled="committing" @click="metadataVisible = false">
              取消
            </NButton>
            <NButton
              type="primary"
              :loading="committing"
              :disabled="!metadataReady"
              @click="confirmCommit"
            >
              {{ committing ? '正在入库…' : '确认并入库' }}
            </NButton>
          </NSpace>
        </template>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped>
.split-page {
  display: flex;
  flex: 1 1 0;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.loading-wrap {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
}

h1 {
  margin: 12px 0 0;
}

.page-header p {
  margin: 12px 0 0;
  color: #756d63;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.side-panel {
  display: flex;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  align-self: stretch;
}

.regions-panel {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
}

.preview-card {
  display: flex !important;
  height: 220px;
  flex: 0 0 220px;
  flex-direction: column;
  overflow: hidden;
}

.preview-card :deep(.n-card__content) {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.metadata-modal {
  width: min(480px, calc(100vw - 24px));
}

@media (max-width: 960px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .workspace {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .side-panel {
    height: auto;
    overflow: visible;
  }

  .regions-panel {
    max-height: 480px;
  }
}
</style>
