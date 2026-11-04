import { computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu'

/** Dùng trong view cần thực đơn: tự tải khi mount và cung cấp trạng thái hiển thị. */
export function useMenu() {
  const menu = useMenuStore()
  onMounted(() => menu.load())

  const isLoading = computed(() => menu.status === 'idle' || menu.status === 'loading')
  const isError = computed(() => menu.status === 'error')
  const errorMessage = computed(
    () => menu.error?.message ?? 'Không tải được thực đơn. Vui lòng thử lại.',
  )
  const canRetry = computed(() => menu.error?.reason !== 'not-configured')

  return {
    menu,
    isLoading,
    isError,
    errorMessage,
    canRetry,
    retry: () => menu.load({ force: true }),
  }
}
