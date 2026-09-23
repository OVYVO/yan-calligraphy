<script setup lang="ts">
defineProps<{
  previewUrl: string;
  loading: boolean;
  hasSelection: boolean;
  matteEnabled: boolean;
}>();
</script>

<template>
  <div class="preview-pane">
    <div class="preview-header">
      <span class="section-title">去底预览</span>
      <NText v-if="loading" depth="3"> 生成中… </NText>
    </div>
    <NSpin :show="loading" class="preview-spin">
      <div class="checkerboard">
        <img v-if="previewUrl" :src="previewUrl" alt="去底预览" />
        <NEmpty
          v-else
          size="small"
          :description="
            !hasSelection
              ? '选择文字区域后自动生成'
              : matteEnabled
              ? '正在生成预览'
              : '启用透明去底后自动生成'
          "
        />
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.preview-pane {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  font-weight: 600;
}

.preview-spin {
  flex: 1;
  min-height: 0;
}

.preview-spin :deep(.n-spin-content) {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.checkerboard {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #e6e0d8;
  border-radius: 8px;
  background-color: #fff;
  background-image: linear-gradient(45deg, #dedede 25%, transparent 25%),
    linear-gradient(-45deg, #dedede 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #dedede 75%),
    linear-gradient(-45deg, transparent 75%, #dedede 75%);
  background-position: 0 0, 0 6px, 6px -6px, -6px 0;
  background-size: 12px 12px;
}

.checkerboard img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
