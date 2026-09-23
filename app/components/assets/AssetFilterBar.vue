<script setup lang="ts">
import { ASSET_STYLES } from '~~/shared/schemas/asset'

const char = defineModel<string>('char', { required: true })
const style = defineModel<string | null>('style', { required: true })
const tag = defineModel<string>('tag', { required: true })

defineEmits<{
  search: []
  reset: []
}>()

const styleOptions = ASSET_STYLES.map(value => ({ label: value, value }))
</script>

<template>
  <NCard size="small">
    <NSpace align="center" :wrap="true" :size="12">
      <NInput
        v-model:value="char"
        clearable
        placeholder="汉字（精确匹配）"
        style="width: 180px"
        @keyup.enter="$emit('search')"
      />
      <NSelect
        v-model:value="style"
        clearable
        :options="styleOptions"
        placeholder="全部书体"
        style="width: 150px"
      />
      <NInput
        v-model:value="tag"
        clearable
        placeholder="标签"
        style="width: 180px"
        @keyup.enter="$emit('search')"
      />
      <NButton type="primary" @click="$emit('search')">
        查询
      </NButton>
      <NButton @click="$emit('reset')">
        重置
      </NButton>
    </NSpace>
  </NCard>
</template>
