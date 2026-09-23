<script setup lang="ts">
import type { SplitDefaults } from '~~/shared/schemas/split'
import { ASSET_STYLES } from '~~/shared/schemas/asset'

const props = defineProps<{
  modelValue: SplitDefaults
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SplitDefaults]
}>()

const styleOptions = ASSET_STYLES.map(value => ({ label: value, value }))

function patch(partial: Partial<SplitDefaults>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function updateStyle(value: SplitDefaults['style']) {
  patch({ style: value })
}

function updateSource(value: string) {
  patch({ source: value })
}

function updateTags(value: string[]) {
  patch({ tags: value })
}

function updateNote(value: string) {
  patch({ note: value })
}
</script>

<template>
  <div class="defaults-form">
    <label>
      <span>书体（必填）</span>
      <NSelect
        :value="modelValue.style"
        :options="styleOptions"
        size="small"
        @update:value="updateStyle"
      />
    </label>
    <label>
      <span>来源（必填）</span>
      <NInput
        :value="modelValue.source"
        size="small"
        placeholder="请输入帖名、作品名或图片来源"
        @update:value="updateSource"
      />
    </label>
    <label>
      <span>标签（可选）</span>
      <NDynamicTags
        :value="modelValue.tags"
        size="small"
        @update:value="updateTags"
      />
    </label>
    <label>
      <span>备注（可选）</span>
      <NInput
        :value="modelValue.note"
        size="small"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 2 }"
        placeholder="可选"
        @update:value="updateNote"
      />
    </label>
  </div>
</template>

<style scoped>
.defaults-form,
label {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

label > span {
  color: #756d63;
  font-size: 12px;
}
</style>
