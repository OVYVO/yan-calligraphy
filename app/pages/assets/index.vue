<script setup lang="ts">
import { useMessage } from 'naive-ui'
import type { AssetListResponse } from '~~/shared/schemas/asset'

type AssetsView = 'card' | 'list'

const VIEW_STORAGE_KEY = 'yan-calligraphy:assets-view'

const message = useMessage()
const items = ref<AssetListResponse['items']>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 24
const char = ref('')
const style = ref<string | null>(null)
const tag = ref('')
const uploadVisible = ref(false)
const view = ref<AssetsView>('card')

const viewOptions = [
  { label: '卡片', value: 'card' },
  { label: '列表', value: 'list' },
]

async function loadAssets() {
  loading.value = true
  try {
    const response = await $fetch<AssetListResponse>('/api/assets', {
      query: {
        page: page.value,
        pageSize,
        ...(char.value.trim() && { char: char.value.trim() }),
        ...(style.value && { style: style.value }),
        ...(tag.value.trim() && { tag: tag.value.trim() }),
      },
    })
    items.value = response.items
    total.value = response.total
  }
  catch {
    message.error('素材列表加载失败')
  }
  finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  void loadAssets()
}

function reset() {
  char.value = ''
  style.value = null
  tag.value = ''
  search()
}

function changePage(value: number) {
  page.value = value
  void loadAssets()
}

watch(view, (value) => {
  if (import.meta.client)
    localStorage.setItem(VIEW_STORAGE_KEY, value)
})

onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === 'card' || saved === 'list')
      view.value = saved
  }
  void loadAssets()
})
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>素材库</h1>
        <p>管理单字照片、书体与标签</p>
      </div>
      <NSpace>
        <NRadioGroup v-model:value="view" size="medium">
          <NRadioButton
            v-for="option in viewOptions"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </NRadioGroup>
        <NButton type="primary" @click="uploadVisible = true">
          上传素材
        </NButton>
      </NSpace>
    </div>

    <AssetsAssetFilterBar
      v-model:char="char"
      v-model:style="style"
      v-model:tag="tag"
      @search="search"
      @reset="reset"
    />

    <NSpin :show="loading">
      <div class="content-area">
        <AssetsAssetGrid
          v-if="view === 'card'"
          :items="items"
          @deleted="loadAssets"
        />
        <AssetsAssetList
          v-else
          :items="items"
          @deleted="loadAssets"
        />
      </div>
    </NSpin>

    <div v-if="total > pageSize" class="pagination">
      <NPagination
        :page="page"
        :page-size="pageSize"
        :item-count="total"
        @update:page="changePage"
      />
    </div>

    <AssetsAssetUploadModal
      v-model:show="uploadVisible"
      @uploaded="search"
    />
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

h1 {
  margin: 0;
}

.page-header p {
  margin: 12px 0 0;
  color: #756d63;
}

.content-area {
  min-height: 260px;
  padding: 12px 0;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
</style>
