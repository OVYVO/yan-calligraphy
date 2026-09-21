<script setup lang="ts">
import type { LayoutType } from '~~/shared/layout/defaults'
import { LAYOUT_TYPE_LABELS } from '~~/shared/layout/defaults'

const layoutType = defineModel<LayoutType>({ required: true })

const options = (Object.keys(LAYOUT_TYPE_LABELS) as LayoutType[]).map(value => ({
  label: LAYOUT_TYPE_LABELS[value],
  value,
}))
</script>

<template>
  <NRadioGroup v-model:value="layoutType" size="medium">
    <NRadioButton
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :label="option.label"
    />
  </NRadioGroup>
</template>
