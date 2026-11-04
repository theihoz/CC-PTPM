import { ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useMenuStore } from '@/stores/menu'
import { useToastStore } from '@/stores/toast'

/**
 * Thêm món vào giỏ từ giao diện: hiện toast khi thành công, báo lỗi tồn kho,
 * và mở hộp thoại "Xóa giỏ hiện tại?" khi món thuộc quán khác.
 * Dùng chung cho trang món và chatbot AI.
 */
export function useAddToCart() {
  const cart = useCartStore()
  const menu = useMenuStore()
  const toast = useToastStore()

  const pendingSwitch = ref(null) // { selection, currentName, nextName }

  function report(result, selection) {
    if (result.status === 'added' || result.status === 'merged') {
      const quantity = selection.quantity ?? 1
      toast.show(`Đã thêm ${quantity} × ${result.food.name} vào giỏ.`, {
        action: { label: 'Xem giỏ', to: { name: 'cart' } },
      })
      return true
    }
    if (result.status === 'stock') {
      toast.show(
        result.remaining > 0
          ? `Chỉ còn có thể thêm ${result.remaining} phần món này.`
          : 'Món này đã hết hoặc bạn đã thêm hết số lượng còn lại.',
        { tone: 'error' },
      )
      return false
    }
    toast.show('Không thêm được món này. Vui lòng thử lại.', { tone: 'error' })
    return false
  }

  function add(selection) {
    const result = cart.addItem(selection)
    if (result.status === 'other-restaurant') {
      pendingSwitch.value = {
        selection,
        currentName: menu.restaurantById(result.currentRestaurantId)?.name ?? 'quán khác',
        nextName: menu.restaurantById(result.nextRestaurantId)?.name ?? 'quán này',
      }
      return false
    }
    return report(result, selection)
  }

  function confirmSwitch() {
    const pending = pendingSwitch.value
    pendingSwitch.value = null
    if (pending) report(cart.replaceWith(pending.selection), pending.selection)
  }

  function cancelSwitch() {
    pendingSwitch.value = null
  }

  return { add, pendingSwitch, confirmSwitch, cancelSwitch }
}
