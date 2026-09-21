<script setup lang="ts">
import type { MenuOption } from 'naive-ui'
import { h, resolveComponent } from 'vue'

const route = useRoute()
const NuxtLink = resolveComponent('NuxtLink')

const menuOptions: MenuOption[] = [
  {
    label: () => h(NuxtLink, { to: '/' }, { default: () => '概览' }),
    key: '/',
  },
  {
    label: () => h(NuxtLink, { to: '/assets' }, { default: () => '素材库' }),
    key: '/assets',
  },
  {
    label: () => h(NuxtLink, { to: '/compose/new' }, { default: () => '新建集字' }),
    key: '/compose/new',
  },
  {
    label: () => h(NuxtLink, { to: '/compositions' }, { default: () => '作品' }),
    key: '/compositions',
  },
]

const activeKey = computed(() => {
  const path = route.path
  if (path.startsWith('/assets'))
    return '/assets'
  if (path.startsWith('/compose'))
    return '/compose/new'
  if (path.startsWith('/compositions'))
    return '/compositions'
  return '/'
})
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        yan-calligraphy
      </div>
      <NMenu :value="activeKey" :options="menuOptions" />
    </aside>
    <main class="content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f7f5f2;
  color: #1f1a14;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  padding: 24px 12px;
  border-right: 1px solid #e6e0d8;
  background: #faf8f5;
}

.brand {
  padding: 0 12px 20px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.content {
  flex: 1;
  padding: 32px 40px;
  min-width: 0;
}
</style>
