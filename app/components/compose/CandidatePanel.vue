<script setup lang="ts">
import type { AssetDto } from '~~/shared/schemas/asset'

const props = defineProps<{
  char: string | null
  selectedAssetId: string | null
}>()

const emit = defineEmits<{
  select: [asset: AssetDto]
}>()

const candidates = ref<AssetDto[]>([])
const loading = ref(false)

async function loadCandidates() {
  if (!props.char) {
    candidates.value = []
    return
  }

  loading.value = true
  try {
    candidates.value = await $fetch<AssetDto[]>(`/api/assets/by-char/${encodeURIComponent(props.char)}`)
  }
  catch {
    candidates.value = []
  }
  finally {
    loading.value = false
  }
}

watch(() => props.char, () => {
  void loadCandidates()
}, { immediate: true })
</script>

<template>
  <NSpin :show="loading">
    <div v-if="char">
      <div class="panel-title">
        「{{ char }}」的候选写法
      </div>
      <div v-if="candidates.length" class="candidate-grid">
        <button
          v-for="asset in candidates"
          :key="asset.id"
          type="button"
          class="candidate"
          :class="{ active: asset.id === selectedAssetId }"
          @click="emit('select', asset)"
        >
          <img :src="asset.thumbUrl" :alt="`${asset.char}候选`">
          <span>{{ asset.style }}书</span>
        </button>
      </div>
      <NEmpty v-else description="库中暂无此字">
        <template #extra>
          <NuxtLink to="/assets">
            去素材库上传
          </NuxtLink>
        </template>
      </NEmpty>
    </div>
    <NEmpty v-else description="先在左侧或画布中选择一个字" />
  </NSpin>
</template>

<style scoped>
.panel-title {
  margin-bottom: 12px;
  font-weight: 600;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.candidate {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  color: inherit;
}

.candidate.active {
  border-color: #18a058;
  box-shadow: 0 0 0 1px #18a058 inset;
}

.candidate img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
  background: #eeeae4;
}

.candidate span {
  color: #756d63;
  font-size: 12px;
  text-align: center;
}
</style>
