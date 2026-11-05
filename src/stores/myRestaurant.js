import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as ownerApi from '@/services/ownerApi'
import { slugify } from '@/lib/slug'
import { useMenuStore } from './menu'

const MESSAGES = {
  not_configured: 'Website chưa được cấu hình kết nối dữ liệu.',
  not_authenticated: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  invalid_restaurant: 'Thông tin quán chưa hợp lệ. Vui lòng kiểm tra lại.',
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
}

export function ownerErrorMessage(code) {
  return MESSAGES[code] ?? MESSAGES.network
}

/** Quán của Chủ quán đang đăng nhập (tối đa một quán mỗi tài khoản). */
export const useMyRestaurantStore = defineStore('myRestaurant', () => {
  const menu = useMenuStore()
  /** Quán của mình, null khi chưa đăng ký. */
  const restaurant = ref(null)
  /** 'idle' | 'loading' | 'ready' | 'error' */
  const status = ref('idle')
  const error = ref('')
  const saving = ref(false)

  async function load() {
    status.value = 'loading'
    error.value = ''
    try {
      restaurant.value = await ownerApi.fetchMyRestaurant()
      status.value = 'ready'
    } catch (err) {
      error.value = ownerErrorMessage(err?.code)
      status.value = 'error'
    }
  }

  /**
   * Lưu form thông tin quán. Kết quả: { ok: true, created } hoặc { ok: false, message }.
   * Sau khi lưu, tải lại thực đơn để quán mới/đã sửa hiện ngay cho khách.
   */
  async function save(form) {
    if (saving.value) return { ok: false, message: '' }
    saving.value = true
    try {
      const result = await ownerApi.saveMyRestaurant({
        name: form.name.trim(),
        slug: slugify(form.name),
        description: (form.description ?? '').trim(),
        imageUrl: (form.imageUrl ?? '').trim(),
        address: form.address.trim(),
        categoryId: Number(form.categoryId),
        openTime: form.openTime,
        closeTime: form.closeTime,
        deliveryTimeMin: Number(form.deliveryTimeMin),
        isOpen: Boolean(form.isOpen),
      })
      restaurant.value = await ownerApi.fetchMyRestaurant()
      menu.load({ force: true })
      return { ok: true, created: result.created }
    } catch (err) {
      return { ok: false, message: ownerErrorMessage(err?.code) }
    } finally {
      saving.value = false
    }
  }

  function reset() {
    restaurant.value = null
    status.value = 'idle'
    error.value = ''
  }

  return { restaurant, status, error, saving, load, save, reset }
})
