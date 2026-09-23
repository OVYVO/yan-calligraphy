<script setup lang="ts">
import type { SplitRegion } from "~~/shared/schemas/split";

defineProps<{
  regions: SplitRegion[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
  update: [id: string, partial: Partial<SplitRegion>];
  remove: [id: string];
}>();

function updateChar(id: string, value: string) {
  emit("update", id, { char: value });
}

function updateMatte(id: string, value: boolean) {
  emit("select", id);
  emit("update", id, { matte: value });
}

</script>

<template>
  <div class="region-list">
    <div class="list-header">
      <span class="section-title">文字区域</span>
      <NTag size="small"> {{ regions.length }} 个 </NTag>
    </div>

    <NEmpty
      v-if="!regions.length"
      description="按住 Ctrl 在图片上拖拽框选"
    />

    <div v-else class="region-item-list ui-scroll">
      <div
        v-for="(region, index) in regions"
        :key="region.id"
        class="region-item"
        :class="{ active: selectedId === region.id }"
        role="button"
        tabindex="0"
        @click="emit('select', region.id)"
        @keydown.enter="emit('select', region.id)"
      >
        <div class="region-head">
          <span class="region-meta"
            >#{{ index + 1 }} · {{ region.width }} × {{ region.height }}</span
          >
          <NInput
            :value="region.char"
            size="small"
            maxlength="1"
            placeholder="填写汉字"
            :status="!region.char ? 'error' : undefined"
            @click.stop="emit('select', region.id)"
            @focus="emit('select', region.id)"
            @update:value="updateChar(region.id, $event)"
          />
        </div>
        <div class="region-options" @click.stop>
          <label>
            <NCheckbox
              :checked="region.matte"
              size="small"
              @update:checked="updateMatte(region.id, $event)"
            />
            透明去底
          </label>
          <NButton
            size="tiny"
            type="error"
            ghost
            @click="emit('remove', region.id)"
          >
            删除
          </NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.region-list {
  display: flex;
  flex: 1 1 0;
  width: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.list-header,
.region-head,
.region-options,
.region-options label {
  display: flex;
  align-items: center;
  gap: 12px;
}

.list-header,
.region-head {
  justify-content: space-between;
}

.list-header {
  flex-shrink: 0;
}

.section-title {
  font-weight: 600;
}

.region-item-list {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.region-item {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.region-item.active {
  border-color: #18a058;
  box-shadow: 0 0 0 1px #18a058 inset;
}

.region-head {
  color: #756d63;
  font-size: 12px;
}

.region-head :deep(.n-input) {
  width: 108px;
}

.region-meta {
  white-space: nowrap;
}

.region-options {
  flex-wrap: wrap;
  justify-content: space-between;
  font-size: 12px;
}
</style>
