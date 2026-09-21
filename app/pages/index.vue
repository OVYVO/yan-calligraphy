<script setup lang="ts">
import { useMessage } from 'naive-ui'

interface HealthResponse {
  ok: boolean
  db: boolean
  sharp?: string
}

const message = useMessage()
const health = ref<HealthResponse | null>(null)
const loading = ref(true)
const errorText = ref('')

async function checkHealth() {
  loading.value = true
  errorText.value = ''
  try {
    health.value = await $fetch<HealthResponse>('/api/health')
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
  void checkHealth()
})
</script>

<template>
  <div>
    <h1>yan-calligraphy</h1>
    <p class="subtitle">
      书法单字素材库与集字排版工作台 — Nuxt 4 管理台空壳
    </p>

    <NCard title="框架状态" style="max-width: 560px; margin-top: 24px;">
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
          <NButton size="small" @click="checkHealth">
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

.error {
  color: #c0392b;
  font-size: 13px;
}
</style>
