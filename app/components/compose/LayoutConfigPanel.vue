<script setup lang="ts">
import type { LayoutConfig, LayoutType } from '~~/shared/layout/defaults'
import { BACKGROUND_PRESETS } from '~~/shared/layout/defaults'

const props = defineProps<{
  layoutType: LayoutType
  layoutConfig: LayoutConfig
}>()

const emit = defineEmits<{
  change: [partial: Partial<LayoutConfig>]
  'reset-positions': []
}>()

const columnsLabel = computed(() => {
  if (props.layoutType === 'grid')
    return '列数'
  if (props.layoutType === 'horizontal')
    return '每行字数'
  return '列数'
})

const showColumns = computed(() => props.layoutType !== 'vertical')

function patch(partial: Partial<LayoutConfig>) {
  emit('change', partial)
}

function onCellSize(value: number) {
  patch({ cellSize: Math.round(value) })
}

function onGap(value: number) {
  patch({ gap: Math.round(value) })
}

function onLineGap(value: number) {
  patch({ lineGap: Math.round(value) })
}

function onPadding(value: number) {
  patch({ padding: Math.round(value) })
}

function onColumns(value: number) {
  patch({ columns: Math.round(value) })
}

function onBackground(value: string) {
  patch({ background: value })
}
</script>

<template>
  <div class="layout-config">
    <div class="section-title">
      布局参数
    </div>

    <div class="slider-row">
      <div class="slider-label">
        <span>字号</span>
        <span class="value">{{ layoutConfig.cellSize }}</span>
      </div>
      <NSlider
        :value="layoutConfig.cellSize"
        :min="40"
        :max="320"
        :step="4"
        @update:value="onCellSize"
      />
    </div>

    <div class="slider-row">
      <div class="slider-label">
        <span>字距</span>
        <span class="value">{{ layoutConfig.gap }}</span>
      </div>
      <NSlider
        :value="layoutConfig.gap"
        :min="0"
        :max="80"
        :step="2"
        @update:value="onGap"
      />
    </div>

    <div class="slider-row">
      <div class="slider-label">
        <span>行距</span>
        <span class="value">{{ layoutConfig.lineGap }}</span>
      </div>
      <NSlider
        :value="layoutConfig.lineGap"
        :min="0"
        :max="80"
        :step="2"
        @update:value="onLineGap"
      />
    </div>

    <div class="slider-row">
      <div class="slider-label">
        <span>边距</span>
        <span class="value">{{ layoutConfig.padding }}</span>
      </div>
      <NSlider
        :value="layoutConfig.padding"
        :min="0"
        :max="120"
        :step="4"
        @update:value="onPadding"
      />
    </div>

    <div v-if="showColumns" class="slider-row">
      <div class="slider-label">
        <span>{{ columnsLabel }}</span>
        <span class="value">{{ layoutConfig.columns }}</span>
      </div>
      <NSlider
        :value="layoutConfig.columns"
        :min="1"
        :max="12"
        :step="1"
        @update:value="onColumns"
      />
    </div>

    <div class="background-block">
      <div class="slider-label">
        <span>背景</span>
      </div>
      <div class="presets">
        <button
          v-for="preset in BACKGROUND_PRESETS"
          :key="preset.value"
          type="button"
          class="preset"
          :class="{ active: layoutConfig.background.toLowerCase() === preset.value.toLowerCase() }"
          :title="preset.label"
          :style="{ background: preset.value }"
          @click="onBackground(preset.value)"
        />
        <NColorPicker
          class="color-picker"
          :value="layoutConfig.background"
          :show-alpha="false"
          :modes="['hex']"
          size="small"
          @update:value="onBackground"
        />
      </div>
    </div>

    <NButton block secondary size="small" @click="emit('reset-positions')">
      重置位置
    </NButton>
    <p class="hint">
      调节间距会重新排版；拖拽微调会在保存后保留，直到再次改间距或点重置。
    </p>
  </div>
</template>

<style scoped>
.layout-config {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-weight: 600;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #756d63;
  font-size: 12px;
}

.value {
  font-variant-numeric: tabular-nums;
  color: #3f3a34;
}

.background-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.preset {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d9d2c8;
  border-radius: 6px;
  cursor: pointer;
}

.preset.active {
  outline: 2px solid #18a058;
  outline-offset: 1px;
}

.color-picker {
  width: 96px;
}

.hint {
  margin: 0;
  color: #8a8278;
  font-size: 12px;
  line-height: 1.5;
}
</style>
