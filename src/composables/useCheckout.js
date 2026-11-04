import { useToastStore } from '@/stores/toast'

/** Bấm "Đặt hàng". Trang Checkout làm ở ticket #9; tạm thời báo cho khách biết. */
export function useCheckout() {
  const toast = useToastStore()
  return function goToCheckout() {
    toast.show('Chức năng đặt hàng sẽ có trong bản cập nhật tới.', { tone: 'info' })
  }
}
