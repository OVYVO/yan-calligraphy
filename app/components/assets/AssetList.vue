<script setup lang="ts">
import type { AssetDto } from '~~/shared/schemas/asset'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NImage, NTag } from 'naive-ui'
import { h, resolveComponent } from 'vue'

defineProps<{
  items: AssetDto[]
}>()

const emit = defineEmits<{
  deleted: [id: string]
}>()

const router = useRouter()
const NuxtLink = resolveComponent('NuxtLink')
const { deletingId, confirmDelete } = useAssetDelete(id => emit('deleted', id))

const columns = computed<DataTableColumns<AssetDto>>(() => [
  {
    title: '缩略图',
    key: 'thumb',
    width: 88,
    render(asset) {
      return h(NImage, {
        src: asset.thumbUrl,
        width: 56,
        height: 56,
        objectFit: 'cover',
        previewDisabled: true,
        style: 'border-radius: 4px; cursor: pointer;',
        onClick: () => router.push(`/assets/${asset.id}`),
      })
    },
  },
  {
    title: '汉字',
    key: 'char',
    width: 88,
    render(asset) {
      return h(
        NuxtLink,
        { to: `/assets/${asset.id}`, style: 'text-decoration: none;' },
        () => h(NTag, { type: 'info', round: true }, () => asset.char),
      )
    },
  },
  {
    title: '书体',
    key: 'style',
    width: 96,
    render(asset) {
      return `${asset.style}书`
    },
  },
  {
    title: '标签',
    key: 'tags',
    ellipsis: { tooltip: true },
    render(asset) {
      return asset.tags.length ? asset.tags.join(' · ') : '—'
    },
  },
  {
    title: '来源',
    key: 'source',
    ellipsis: { tooltip: true },
    render(asset) {
      return asset.source || '—'
    },
  },
  {
    title: '尺寸',
    key: 'size',
    width: 120,
    render(asset) {
      return `${asset.width} × ${asset.height}`
    },
  },
  {
    title: '上传时间',
    key: 'createdAt',
    width: 168,
    render(asset) {
      return new Date(asset.createdAt).toLocaleString('zh-CN')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 148,
    fixed: 'right',
    render(asset) {
      return h('div', { style: 'display: flex; gap: 8px;' }, [
        h(
          NButton,
          {
            size: 'tiny',
            onClick: () => router.push(`/assets/${asset.id}`),
          },
          () => '详情',
        ),
        h(
          NButton,
          {
            size: 'tiny',
            type: 'error',
            ghost: true,
            loading: deletingId.value === asset.id,
            onClick: (event: MouseEvent) => confirmDelete(asset, event),
          },
          () => '删除',
        ),
      ])
    },
  },
])
</script>

<template>
  <NDataTable
    v-if="items.length"
    :columns="columns"
    :data="items"
    :bordered="false"
    :single-line="false"
    size="medium"
  />
  <NEmpty v-else description="还没有符合条件的素材，去上传一张吧" />
</template>
