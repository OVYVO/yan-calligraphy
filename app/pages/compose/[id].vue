<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div>
    <h1>集字编辑</h1>
    <p>阶段 03 实现</p>
    <p class="meta">作品 ID：{{ route.params.id }}</p>
  </div>
</template>

<style scoped>
.meta {
  color: #6b635a;
  font-size: 14px;
}
</style>
