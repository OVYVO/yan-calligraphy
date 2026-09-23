<script setup lang="ts">
import { useDialog, useMessage } from 'naive-ui'
import type { AssetDto } from '~~/shared/schemas/asset'
import { ASSET_STYLES } from '~~/shared/schemas/asset'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const id = computed(() => String(route.params.id))
const asset = ref<AssetDto | null>(null)
const alternatives = ref<AssetDto[]>([])
const loading = ref(true)
const saving = ref(false)
const form = ref({
  char: '',
  style: '其他',
  source: '',
  tags: '',
  note: '',
})
const styleOptions = ASSET_STYLES.map(value => ({ label: value, value }))

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
      return data.message
  }
  return error instanceof Error ? error.message : '操作失败'
}

async function loadAlternatives(char: string) {
  const all = await $fetch<AssetDto[]>(`/api/assets/by-char/${encodeURIComponent(char)}`)
  alternatives.value = all.filter(item => item.id !== id.value)
}

async function loadAsset() {
  loading.value = true
  try {
    const data = await $fetch<AssetDto>(`/api/assets/${id.value}`)
    asset.value = data
    form.value = {
      char: data.char,
      style: data.style,
      source: data.source ?? '',
      tags: data.tags.join('，'),
      note: data.note ?? '',
    }
    await loadAlternatives(data.char)
  }
  catch (error) {
    message.error(getErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    const updated = await $fetch<AssetDto>(`/api/assets/${id.value}`, {
      method: 'PATCH',
      body: {
        char: form.value.char,
        style: form.value.style,
        source: form.value.source,
        tags: form.value.tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
        note: form.value.note,
      },
    })
    asset.value = updated
    await loadAlternatives(updated.char)
    message.success('素材信息已保存')
  }
  catch (error) {
    message.error(getErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

function remove() {
  dialog.warning({
    title: '删除素材',
    content: '确认删除这条素材吗？图片文件会保留，素材将不再出现在列表中。',
    positiveText: '确认删除',
    negativeText: '取消',
    async onPositiveClick() {
      try {
        await $fetch(`/api/assets/${id.value}`, { method: 'DELETE' })
        message.success('素材已删除')
        await router.push('/assets')
      }
      catch (error) {
        message.error(getErrorMessage(error))
      }
    },
  })
}

watch(id, loadAsset, { immediate: true })
</script>

<template>
  <NSpin :show="loading">
    <div v-if="asset">
      <div class="page-header">
        <NButton text @click="router.push('/assets')">
          ← 返回素材库
        </NButton>
        <NSpace>
          <NButton type="error" ghost @click="remove">
            删除
          </NButton>
          <NButton type="primary" :loading="saving" @click="save">
            保存
          </NButton>
        </NSpace>
      </div>

      <div class="detail-layout">
        <NCard title="原图">
          <NImage class="main-image" :src="asset.imageUrl" :alt="asset.char" object-fit="contain" />
        </NCard>

        <NCard title="素材信息">
          <NForm label-placement="top">
            <NGrid cols="1 560:2" :x-gap="12">
              <NFormItemGi label="汉字" required>
                <NInput v-model:value="form.char" maxlength="2" />
              </NFormItemGi>
              <NFormItemGi label="书体">
                <NSelect v-model:value="form.style" :options="styleOptions" />
              </NFormItemGi>
            </NGrid>
            <NFormItem label="来源">
              <NInput v-model:value="form.source" />
            </NFormItem>
            <NFormItem label="标签">
              <NInput v-model:value="form.tags" placeholder="多个标签用逗号分隔" />
            </NFormItem>
            <NFormItem label="备注">
              <NInput v-model:value="form.note" type="textarea" :rows="4" />
            </NFormItem>
          </NForm>
          <NDescriptions :column="1" size="small" label-placement="left">
            <NDescriptionsItem label="尺寸">
              {{ asset.width }} × {{ asset.height }} px
            </NDescriptionsItem>
            <NDescriptionsItem label="创建时间">
              {{ new Date(asset.createdAt).toLocaleString('zh-CN') }}
            </NDescriptionsItem>
            <NDescriptionsItem label="更新时间">
              {{ new Date(asset.updatedAt).toLocaleString('zh-CN') }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>
      </div>

      <NCard v-if="alternatives.length" title="同字其他写法" class="alternatives">
        <NSpace>
          <NuxtLink
            v-for="item in alternatives"
            :key="item.id"
            :to="`/assets/${item.id}`"
            class="alternative"
          >
            <img :src="item.thumbUrl" :alt="`${item.char}的其他写法`">
            <span>{{ item.style }}书</span>
          </NuxtLink>
        </NSpace>
      </NCard>
    </div>
    <NEmpty v-else-if="!loading" description="素材不存在或已删除">
      <template #extra>
        <NButton @click="router.push('/assets')">
          返回素材库
        </NButton>
      </template>
    </NEmpty>
  </NSpin>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  gap: 12px;
}

.main-image {
  width: 100%;
  max-height: 70vh;
}

.alternatives {
  margin-top: 12px;
}

.alternative {
  display: flex;
  width: 110px;
  flex-direction: column;
  gap: 12px;
  color: inherit;
  text-align: center;
  text-decoration: none;
}

.alternative img {
  width: 110px;
  height: 110px;
  border-radius: 4px;
  object-fit: cover;
}

@media (max-width: 860px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
