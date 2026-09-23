<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'
import { useMessage } from 'naive-ui'
import { ASSET_STYLES } from '~~/shared/schemas/asset'

const show = defineModel<boolean>('show', { required: true })
const emit = defineEmits<{
  uploaded: []
}>()

const message = useMessage()
const files = ref<UploadFileInfo[]>([])
const char = ref('')
const style = ref('其他')
const source = ref('')
const tagsText = ref('')
const note = ref('')
const submitting = ref(false)
const styleOptions = ASSET_STYLES.map(value => ({ label: value, value }))

function reset() {
  files.value = []
  char.value = ''
  style.value = '其他'
  source.value = ''
  tagsText.value = ''
  note.value = ''
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
  if (!Array.from(char.value.trim()).length) {
    message.warning('请填写汉字')
    return
  }
  const selectedFiles = files.value.map(item => item.file).filter((file): file is File => Boolean(file))
  if (!selectedFiles.length) {
    message.warning('请至少选择一张图片')
    return
  }

  submitting.value = true
  let uploaded = 0
  try {
    for (const file of selectedFiles) {
      const form = new FormData()
      form.append('file', file)
      form.append('char', char.value)
      form.append('style', style.value)
      form.append('source', source.value)
      form.append('tags', JSON.stringify(tagsText.value.split(/[,，]/).map(tag => tag.trim()).filter(Boolean)))
      form.append('note', note.value)
      await $fetch('/api/assets', { method: 'POST', body: form })
      uploaded++
    }
    message.success(`成功上传 ${uploaded} 张素材`)
    show.value = false
    reset()
    emit('uploaded')
  }
  catch (error) {
    message.error(`${getErrorMessage(error)}${uploaded ? `（已成功 ${uploaded} 张）` : ''}`)
    if (uploaded)
      emit('uploaded')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    title="上传单字素材"
    style="width: min(680px, 92vw)"
    :mask-closable="!submitting"
  >
    <NForm label-placement="top">
      <NFormItem label="图片" required>
        <NUpload
          v-model:file-list="files"
          multiple
          accept="image/jpeg,image/png,image/webp"
          :default-upload="false"
          list-type="image-card"
          :disabled="submitting"
        >
          选择图片
        </NUpload>
      </NFormItem>
      <NGrid cols="1 640:2" :x-gap="12">
        <NFormItemGi label="汉字（本批共用）" required>
          <NInput v-model:value="char" maxlength="2" placeholder="例如：永" />
        </NFormItemGi>
        <NFormItemGi label="书体">
          <NSelect v-model:value="style" :options="styleOptions" />
        </NFormItemGi>
      </NGrid>
      <NFormItem label="来源">
        <NInput v-model:value="source" placeholder="帖名或来源，可选" />
      </NFormItem>
      <NFormItem label="标签">
        <NInput v-model:value="tagsText" placeholder="用逗号分隔，例如：临摹，精选" />
      </NFormItem>
      <NFormItem label="备注">
        <NInput v-model:value="note" type="textarea" :rows="3" placeholder="可选" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="submitting" @click="show = false">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="submit">
          开始上传
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
