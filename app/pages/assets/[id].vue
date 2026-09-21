<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div>
    <h1>素材详情</h1>
    <p>阶段 02 实现</p>
    <p class="meta">素材 ID：{{ route.params.id }}</p>
  </div>
</template>

<style scoped>
.meta {
  color: #6b635a;
  font-size: 14px;
}
</style>
