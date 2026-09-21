<script setup lang="ts">
import { useMessage } from 'naive-ui'
import type { LayoutType } from '~~/shared/layout/defaults'

const route = useRoute()
const router = useRouter()
const message = useMessage()
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
  selectIndex,
  setLayoutType,
  assignAsset,
  rebuildFromText,
  save,
} = useCompositionEditor(id)

function onLayoutChange(value: LayoutType) {
  setLayoutType(value)
}

async function exportPng() {
  try {
    await canvasRef.value?.exportPng(title.value.trim() || '集字作品')
    message.success('已导出 PNG')
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : '导出失败')
  }
}
</script>

<template>
  <NSpin :show="loading" class="editor-spin">
    <div v-if="composition" class="editor">
      <div class="topbar">
        <NButton text @click="router.push('/compositions')">
          ← 返回作品列表
        </NButton>
        <NSpace>
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
            竖排单列；横排自动换行；宫格 {{ layoutConfig.columns }} 列
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
          />
        </section>

        <aside class="side-panel">
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
  height: calc(100vh - 64px);
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
  gap: 16px;
  padding: 14px 16px;
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
  gap: 6px;
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
  gap: 16px;
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
  padding: 14px;
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
  margin-bottom: 10px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .editor-spin {
    height: auto;
    min-height: calc(100vh - 64px);
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .canvas-panel {
    height: min(70vh, 720px);
  }
}
</style>
