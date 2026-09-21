<script setup lang="ts">
import type { CompositionItemDto } from '~~/shared/schemas/composition'

defineProps<{
  items: CompositionItemDto[]
  selectedIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()
</script>

<template>
  <div class="sequence">
    <button
      v-for="(item, index) in items"
      :key="`${item.char}-${index}`"
      type="button"
      class="sequence-item"
      :class="{
        active: index === selectedIndex,
        missing: !item.assetId,
      }"
      @click="$emit('select', index)"
    >
      <span class="char">{{ item.char }}</span>
      <span class="status">{{ item.assetId ? '已选' : '缺字' }}</span>
    </button>
  </div>
</template>

<style scoped>
.sequence {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.sequence-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.sequence-item.active {
  border-color: #18a058;
  background: #f3fbf6;
}

.sequence-item.missing .char,
.sequence-item.missing .status {
  color: #d94841;
}

.char {
  font-size: 22px;
  line-height: 1;
}

.status {
  color: #756d63;
  font-size: 12px;
}
</style>
