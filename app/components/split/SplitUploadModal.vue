<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'
import { useMessage } from 'naive-ui'
import type { SplitSessionDto } from '~~/shared/schemas/split'

const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{
  created: [session: SplitSessionDto]
}>()

const message = useMessage()
const files = ref<UploadFileInfo[]>([])
const submitting = ref(false)

function reset() {
  files.value = []
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
      return data.message
  }
  return error instanceof Error ? error.message : '上传失败'
}

async function submit() {
  const file = files.value[0]?.file
  if (!file) {
    message.warning('请选择一张图片')
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    message.error('图片不能超过 20MB')
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    message.error('仅支持 JPEG、PNG 或 WebP 图片')
    return
  }

  submitting.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const session = await $fetch<SplitSessionDto>('/api/split/sessions', {
      method: 'POST',
      body,
    })
    show.value = false
    reset()
    emit('created', session)
  }
  catch (error) {
    message.error(getErrorMessage(error))
  }
  finally {
    submitting.value = false
  }
}

watch(show, (visible) => {
  if (!visible && !submitting.value)
    reset()
})
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    title="多字入库"
    style="width: min(520px, 92vw)"
    :mask-closable="!submitting"
  >
    <NForm label-placement="top">
      <NFormItem label="多字图片" required>
        <NUpload
          v-model:file-list="files"
          accept="image/jpeg,image/png,image/webp"
          :max="1"
          :default-upload="false"
          list-type="image-card"
          :disabled="submitting"
        >
          选择图片
        </NUpload>
      </NFormItem>
      <NP depth="3" style="margin: 0">
        支持 JPEG、PNG、WebP，最大 20MB。确认后进入画布框选。
      </NP>
    </NForm>
    <template #footer>
      <NSpace justify="end" :size="12">
        <NButton :disabled="submitting" @click="show = false">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="submit">
          确认上传
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
