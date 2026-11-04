import { useRouter } from 'vue-router'

/** Bấm "Đặt hàng" trong giỏ: sang trang Checkout (guard sẽ yêu cầu đăng nhập nếu cần). */
export function useCheckout() {
  const router = useRouter()
  return function goToCheckout() {
    router.push({ name: 'checkout' })
  }
}
