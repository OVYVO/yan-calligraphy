<script setup lang="ts">
import type { AssetDto } from "~~/shared/schemas/asset";

defineProps<{
  items: AssetDto[];
}>();

const emit = defineEmits<{
  deleted: [id: string];
}>();

const { deletingId, confirmDelete } = useAssetDelete((id) =>
  emit("deleted", id)
);
</script>

<template>
  <div v-if="items.length" class="asset-grid">
    <NuxtLink
      v-for="asset in items"
      :key="asset.id"
      class="asset-link"
      :to="`/assets/${asset.id}`"
    >
      <NCard hoverable content-style="padding: 0">
        <div class="thumb-wrap">
          <img
            :src="asset.thumbUrl"
            :alt="`${asset.char}的${asset.style}书素材`"
          />
          <NTag class="char-tag" type="info" round>
            {{ asset.char }}
          </NTag>
        </div>
        <div class="meta">
          <div class="meta-info">
            <span class="style">{{ asset.style }}书</span>
            <span v-if="asset.tags.length" class="tags">
              {{ asset.tags.join(" · ") }}
            </span>
          </div>
          <div class="meta-actions" @click.prevent.stop>
            <NButton
              type="error"
              ghost
              size="tiny"
              :loading="deletingId === asset.id"
              @click="confirmDelete(asset, $event)"
            >
              删除
            </NButton>
          </div>
        </div>
      </NCard>
    </NuxtLink>
  </div>
  <NEmpty v-else description="还没有符合条件的素材，去上传一张吧" />
</template>

<style scoped>
.asset-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.asset-link {
  display: block;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.thumb-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: #eeeae4;
}

.thumb-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.char-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 18px;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
}

.meta-info {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.style {
  font-size: 14px;
}

.tags {
  overflow: hidden;
  color: #756d63;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-actions {
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .asset-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .asset-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .asset-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
