<script setup lang="ts">
import type { AssetListResponse } from '~~/shared/schemas/asset'
import { useMessage } from 'naive-ui'

interface HealthResponse {
  ok: boolean
  db: boolean
  sharp?: string
}

const message = useMessage()
const health = ref<HealthResponse | null>(null)
const assets = ref<AssetListResponse['items']>([])
const assetTotal = ref(0)
const loading = ref(true)
const errorText = ref('')

async function loadDashboard() {
  loading.value = true
  errorText.value = ''
  try {
    const [healthResponse, assetResponse] = await Promise.all([
      $fetch<HealthResponse>('/api/health'),
      $fetch<AssetListResponse>('/api/assets', { query: { page: 1, pageSize: 8 } }),
    ])
    health.value = healthResponse
    assets.value = assetResponse.items
    assetTotal.value = assetResponse.total
  }
  catch (error) {
    health.value = null
    errorText.value = error instanceof Error ? error.message : '健康检查失败'
    message.error('无法连接健康检查接口')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <div>
    <h1>yan-calligraphy</h1>
    <p class="subtitle">
      书法单字素材库与集字排版工作台
    </p>

    <NGrid cols="1 720:2" :x-gap="20" :y-gap="20" class="dashboard">
      <NGridItem>
        <NCard title="素材">
          <NStatistic label="素材总数" :value="assetTotal" />
          <template #footer>
            <NuxtLink to="/assets">
              进入素材库
            </NuxtLink>
          </template>
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard title="最近作品">
          <NEmpty description="阶段 03 实现" size="small" />
        </NCard>
      </NGridItem>
    </NGrid>

    <NCard v-if="assets.length" title="最近上传" class="recent">
      <NGrid cols="2 560:4 920:8" :x-gap="12" :y-gap="12">
        <NGridItem v-for="asset in assets" :key="asset.id">
          <NuxtLink :to="`/assets/${asset.id}`" class="recent-item">
            <img :src="asset.thumbUrl" :alt="asset.char">
            <span>{{ asset.char }}</span>
          </NuxtLink>
        </NGridItem>
      </NGrid>
    </NCard>

    <NCard title="框架状态" class="status-card">
      <NSpin :show="loading">
        <NSpace vertical :size="12">
          <div>渲染模式：CSR（ssr: false）</div>
          <div>UI：Naive UI（中文）</div>
          <div>状态：Pinia 已注册</div>
          <div>
            健康检查：
            <NTag v-if="health?.ok && health.db" type="success" size="small">
              数据库已连接
            </NTag>
            <NTag v-else-if="errorText" type="error" size="small">
              失败
            </NTag>
            <NTag v-else type="warning" size="small">
              检查中
            </NTag>
          </div>
          <div v-if="health?.sharp">
            sharp：{{ health.sharp }}
          </div>
          <div v-if="errorText" class="error">
            {{ errorText }}
          </div>
          <NButton size="small" @click="loadDashboard">
            重新检查
          </NButton>
        </NSpace>
      </NSpin>
    </NCard>
  </div>
</template>

<style scoped>
h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  margin: 8px 0 0;
  color: #6b635a;
}

.dashboard {
  margin-top: 24px;
}

.recent,
.status-card {
  margin-top: 20px;
}

.recent-item {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 4px;
  color: white;
}

.recent-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recent-item span {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 7px;
  border-radius: 12px;
  background: rgb(0 0 0 / 55%);
}

.error {
  color: #c0392b;
  font-size: 13px;
}
</style>
