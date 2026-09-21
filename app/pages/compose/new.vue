<script setup lang="ts">
import { useMessage } from 'naive-ui'
import { splitText } from '~~/shared/layout/splitText'

const router = useRouter()
const message = useMessage()
const title = ref('')
const text = ref('')
const submitting = ref(false)

const previewChars = computed(() => splitText(text.value))

watch(text, (value) => {
  if (!title.value.trim()) {
    const chars = splitText(value)
    if (chars.length)
      title.value = chars.slice(0, 8).join('')
  }
})

async function startCompose() {
  if (!text.value.trim()) {
    message.warning('请先输入文案')
    return
  }
  if (!previewChars.value.length) {
    message.warning('文案中没有可集的汉字（空白与标点会被忽略）')
    return
  }

  submitting.value = true
  try {
    const composition = await createCompositionFromText({
      title: title.value.trim() || previewChars.value.slice(0, 8).join(''),
      text: text.value,
    })
    message.success('作品已创建')
    await router.push(`/compose/${composition.id}`)
  }
  catch (error) {
    const msg = error && typeof error === 'object' && 'data' in error
      && error.data && typeof error.data === 'object'
      && 'message' in error.data
      && typeof error.data.message === 'string'
      ? error.data.message
      : error instanceof Error ? error.message : '创建失败'
    message.error(msg)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1>新建集字</h1>
        <p>输入文案后会自动拆出汉字并预选素材；标点与空白会被忽略。</p>
      </div>
      <NButton @click="router.push('/compositions')">
        返回作品列表
      </NButton>
    </div>

    <NCard style="max-width: 720px">
      <NForm label-placement="top">
        <NFormItem label="标题">
          <NInput v-model:value="title" maxlength="100" placeholder="默认取文案前几个字" />
        </NFormItem>
        <NFormItem label="文案" required>
          <NInput
            v-model:value="text"
            type="textarea"
            :rows="6"
            maxlength="2000"
            placeholder="例如：春风又绿江南岸"
          />
        </NFormItem>
      </NForm>

      <div class="preview">
        将拆出 {{ previewChars.length }} 个汉字
        <span v-if="previewChars.length">：{{ previewChars.join(' ') }}</span>
      </div>

      <NButton type="primary" :loading="submitting" @click="startCompose">
        开始集字
      </NButton>
    </NCard>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

h1 {
  margin: 0;
}

.page-header p,
.preview {
  margin: 6px 0 0;
  color: #756d63;
}

.preview {
  margin: 0 0 20px;
}
</style>
