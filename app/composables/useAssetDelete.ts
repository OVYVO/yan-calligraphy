import { useDialog, useMessage } from 'naive-ui'
import type { AssetDto } from '~~/shared/schemas/asset'

export function useAssetDelete(onDeleted?: (id: string) => void) {
  const message = useMessage()
  const dialog = useDialog()
  const deletingId = ref<string | null>(null)

  function getErrorMessage(error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      const data = error.data
      if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string')
        return data.message
    }
    return error instanceof Error ? error.message : '删除失败'
  }

  function confirmDelete(asset: AssetDto, event?: Event) {
    event?.preventDefault()
    event?.stopPropagation()

    dialog.warning({
      title: '删除素材',
      content: `确认删除「${asset.char}」这条素材吗？图片文件会保留，素材将不再出现在列表中。`,
      positiveText: '确认删除',
      negativeText: '取消',
      async onPositiveClick() {
        deletingId.value = asset.id
        try {
          await $fetch(`/api/assets/${asset.id}`, { method: 'DELETE' })
          message.success('素材已删除')
          onDeleted?.(asset.id)
        }
        catch (error) {
          message.error(getErrorMessage(error))
          throw error
        }
        finally {
          deletingId.value = null
        }
      },
    })
  }

  return {
    deletingId,
    confirmDelete,
  }
}
