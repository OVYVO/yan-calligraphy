<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { NButton, useDialog, useMessage } from 'naive-ui'
import { h } from 'vue'
import type { CompositionListResponse, CompositionSummaryDto } from '~~/shared/schemas/composition'
import { LAYOUT_TYPE_LABELS } from '~~/shared/layout/defaults'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const items = ref<CompositionSummaryDto[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)
const deletingId = ref<string | null>(null)

async function loadCompositions() {
  loading.value = true
  try {
    const response = await $fetch<CompositionListResponse>('/api/compositions', {
      query: { page: page.value, pageSize },
    })
    items.value = response.items
    total.value = response.total
  }
  catch {
    message.error('作品列表加载失败')
  }
  finally {
    loading.value = false
  }
}

function confirmDelete(row: CompositionSummaryDto) {
  dialog.warning({
    title: '删除作品',
    content: `确认删除「${row.title}」吗？此操作不可恢复。`,
    positiveText: '确认删除',
    negativeText: '取消',
    async onPositiveClick() {
      deletingId.value = row.id
      try {
        await $fetch(`/api/compositions/${row.id}`, { method: 'DELETE' })
        message.success('作品已删除')
        await loadCompositions()
      }
      catch {
        message.error('删除失败')
        throw new Error('删除失败')
      }
      finally {
        deletingId.value = null
      }
    },
  })
}

const columns = computed<DataTableColumns<CompositionSummaryDto>>(() => [
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
  },
  {
    title: '文案',
    key: 'text',
    ellipsis: { tooltip: true },
    render(row) {
      return row.text.length > 24 ? `${row.text.slice(0, 24)}…` : row.text
    },
  },
  {
    title: '布局',
    key: 'layoutType',
    width: 96,
    render(row) {
      return LAYOUT_TYPE_LABELS[row.layoutType]
    },
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 180,
    render(row) {
      return new Date(row.updatedAt).toLocaleString('zh-CN')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render(row) {
      return h('div', { style: 'display:flex;gap:8px;' }, [
        h(NButton, {
          size: 'tiny',
          onClick: () => router.push(`/compose/${row.id}`),
        }, () => '打开'),
        h(NButton, {
          size: 'tiny',
          type: 'error',
          ghost: true,
          loading: deletingId.value === row.id,
          onClick: () => confirmDelete(row),
        }, () => '删除'),
      ])
    },
  },
])

function changePage(value: number) {
  page.value = value
  void loadCompositions()
}

onMounted(loadCompositions)
</script>

<template>
  <div>
    <div class="page-header">
      <div>
        <h1>作品</h1>
        <p>保存过的集字可在这里继续编辑或删除</p>
      </div>
      <NButton type="primary" @click="router.push('/compose/new')">
        新建集字
      </NButton>
    </div>

    <NSpin :show="loading">
      <NDataTable
        v-if="items.length"
        :columns="columns"
        :data="items"
        :bordered="false"
      />
      <NEmpty v-else description="还没有作品">
        <template #extra>
          <NButton type="primary" @click="router.push('/compose/new')">
            去新建集字
          </NButton>
        </template>
      </NEmpty>
    </NSpin>

    <div v-if="total > pageSize" class="pagination">
      <NPagination
        :page="page"
        :page-size="pageSize"
        :item-count="total"
        @update:page="changePage"
      />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
}

.page-header p {
  margin: 6px 0 0;
  color: #756d63;
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 24px 0 8px;
}
</style>
