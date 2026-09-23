<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui'
import type { LayoutConfig, LayoutType } from '~~/shared/layout/defaults'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const id = computed(() => String(route.params.id))
const canvasRef = ref<{ exportPng: (filename: string) => Promise<void> } | null>(null)

const {
  composition,
  title,
  text,
  layoutType,
  layoutConfig,
  items,
  selectedIndex,
  selectedItem,
  assetsMap,
  loading,
  saving,
  isDirty,
  selectIndex,
  setLayoutType,
  updateLayoutConfig,
  resetPositions,
  moveItem,
  assignAsset,
  rebuildFromText,
  save,
} = useCompositionEditor(id)

function onLayoutChange(value: LayoutType) {
  setLayoutType(value)
}

function onLayoutConfigChange(partial: Partial<LayoutConfig>) {
  updateLayoutConfig(partial)
}

function onItemPosition(index: number, x: number, y: number) {
  moveItem(index, x, y)
}

function exportFilename() {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('')
  const base = (title.value.trim() || '集字').replace(/[\\/:*?"<>|]/g, '_')
  return `${base}-${stamp}.png`
}

async function exportPng() {
  try {
    await canvasRef.value?.exportPng(exportFilename())
    message.success('已导出 PNG')
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '导出失败')
  }
}

const layoutHint = computed(() => {
  if (layoutType.value === 'vertical')
    return '竖排单列'
  if (layoutType.value === 'horizontal')
    return `横排每行 ${layoutConfig.value.columns} 字`
  return `宫格 ${layoutConfig.value.columns} 列`
})

onBeforeRouteLeave(() => {
  if (!isDirty.value)
    return true

  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '尚未保存',
      content: '当前作品有未保存的修改，确定离开吗？',
      positiveText: '离开',
      negativeText: '继续编辑',
      onPositiveClick: () => {
        resolve(true)
      },
      onNegativeClick: () => {
        resolve(false)
      },
      onClose: () => {
        resolve(false)
      },
    })
  })
})
</script>

<template>
  <NSpin :show="loading" class="editor-spin">
    <div v-if="composition" class="editor">
      <div class="topbar">
        <NButton text @click="router.push('/compositions')">
          ← 返回作品列表
        </NButton>
        <NSpace align="center">
          <NTag v-if="isDirty" size="small" type="warning">
            未保存
          </NTag>
          <NButton :loading="saving" @click="save">
            保存
          </NButton>
          <NButton type="primary" @click="exportPng">
            导出 PNG
          </NButton>
        </NSpace>
      </div>

      <div class="toolbar">
        <div class="toolbar-fields">
          <div class="field">
            <label>标题</label>
            <NInput v-model:value="title" placeholder="作品标题" />
          </div>
          <div class="field field-text">
            <label>文案</label>
            <NInput v-model:value="text" placeholder="集字文案" />
          </div>
          <NButton secondary @click="rebuildFromText">
            按文案重新拆字
          </NButton>
        </div>
        <div class="toolbar-layout">
          <ComposeLayoutTypePicker
            :model-value="layoutType"
            @update:model-value="onLayoutChange"
          />
          <span class="hint">
            {{ layoutHint }} · 可拖拽画布中的字微调位置
          </span>
        </div>
      </div>

      <div class="workspace">
        <section class="canvas-panel">
          <ComposeCanvas
            ref="canvasRef"
            :items="items"
            :layout-type="layoutType"
            :layout-config="layoutConfig"
            :assets-map="assetsMap"
            :selected-index="selectedIndex"
            @update:selected-index="selectIndex"
            @update:item-position="onItemPosition"
          />
        </section>

        <aside class="side-panel">
          <div class="panel-block">
            <ComposeLayoutConfigPanel
              :layout-type="layoutType"
              :layout-config="layoutConfig"
              @change="onLayoutConfigChange"
              @reset-positions="resetPositions"
            />
          </div>
          <div class="panel-block">
            <ComposeCandidatePanel
              :char="selectedItem?.char ?? null"
              :selected-asset-id="selectedItem?.assetId ?? null"
              @select="assignAsset"
            />
          </div>
          <div class="panel-block sequence-block">
            <div class="section-title">
              字序列
            </div>
            <ComposeCharSequenceList
              :items="items"
              :selected-index="selectedIndex"
              @select="selectIndex"
            />
          </div>
        </aside>
      </div>
    </div>

    <NEmpty v-else-if="!loading" description="作品不存在">
      <template #extra>
        <NButton @click="router.push('/compose/new')">
          去新建集字
        </NButton>
      </template>
    </NEmpty>
  </NSpin>
</template>

<style scoped>
.editor-spin {
  display: block;
  height: calc(100vh - 24px);
}

.editor-spin :deep(.n-spin-content) {
  height: 100%;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.topbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
}

.toolbar-fields {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  min-width: 0;
}

.field {
  display: flex;
  width: 180px;
  flex-direction: column;
  gap: 12px;
}

.field-text {
  flex: 1;
  width: auto;
  min-width: 220px;
}

.field label {
  color: #756d63;
  font-size: 12px;
}

.toolbar-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.hint {
  color: #756d63;
  font-size: 12px;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.canvas-panel {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.side-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.panel-block {
  padding: 12px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
}

.sequence-block {
  display: flex;
  min-height: 180px;
  flex: 1;
  flex-direction: column;
}

.section-title {
  margin-bottom: 12px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .editor-spin {
    height: auto;
    min-height: calc(100vh - 24px);
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .canvas-panel {
    height: min(70vh, 720px);
  }
}
</style>
