import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as orderApi from '@/services/orderApi'
import { orderErrorMessage } from '@/lib/orderErrors'
import { normalizePhone } from '@/lib/validation'
import { useCartStore } from './cart'
import { useMenuStore } from './menu'

/**
 * Đặt hàng. Kết quả: { ok: true, order } hoặc
 * { ok: false, code, message, shortages } với thông báo tiếng Việt.
 */
export const useOrdersStore = defineStore('orders', () => {
  const cart = useCartStore()
  const menu = useMenuStore()
  const placing = ref(false)

  async function placeOrder(delivery) {
    if (placing.value) return { ok: false, code: 'busy', message: '', shortages: [] }
    // Chỉ gửi lựa chọn; server tự tính giá từ thực đơn.
    // Dòng có món đã bị Chủ quán xóa không còn trong cart.lines nên không gửi đi.
    const items = cart.lines.map(({ foodId, sizeId, toppingIds, spiceLevel, quantity }) => ({
      foodId,
      sizeId,
      toppingIds: [...toppingIds],
      spiceLevel,
      quantity,
    }))
    const payload = {
      recipientName: delivery.recipientName.trim(),
      phone: normalizePhone(delivery.phone),
      address: delivery.address.trim(),
      note: (delivery.note ?? '').trim(),
    }

    placing.value = true
    try {
      const order = await orderApi.placeOrder(items, payload)
      cart.clear()
      // Tồn kho vừa thay đổi trên máy chủ.
      menu.load({ force: true })
      return { ok: true, order }
    } catch (err) {
      const code = err?.code ?? 'network'
      if (code === 'out_of_stock' || code === 'invalid_item') menu.load({ force: true })
      return { ok: false, code, message: orderErrorMessage(code), shortages: err?.shortages ?? [] }
    } finally {
      placing.value = false
    }
  }

  const cancelling = ref(false)

  /** Hủy đơn. Thành công: { ok: true, cancelledAt }; lỗi: { ok: false, code, message }. */
  async function cancelOrder(orderId) {
    if (cancelling.value) return { ok: false, code: 'busy', message: '' }
    cancelling.value = true
    try {
      const { cancelledAt } = await orderApi.cancelOrder(orderId)
      // Kho vừa được hoàn lại trên máy chủ.
      menu.load({ force: true })
      return { ok: true, cancelledAt }
    } catch (err) {
      const code = err?.code ?? 'network'
      return { ok: false, code, message: orderErrorMessage(code) }
    } finally {
      cancelling.value = false
    }
  }

  return { placing, placeOrder, cancelling, cancelOrder }
})
