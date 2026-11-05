import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as ownerApi from '@/services/ownerApi'
import { slugify } from '@/lib/slug'
import { toFoodPayload } from '@/lib/foodForm'
import { useMenuStore } from './menu'

const MESSAGES = {
  not_configured: 'Website chưa được cấu hình kết nối dữ liệu.',
  not_authenticated: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  invalid_restaurant: 'Thông tin quán chưa hợp lệ. Vui lòng kiểm tra lại.',
  no_restaurant: 'Bạn cần đăng ký quán trước khi thêm món.',
  food_not_found: 'Không tìm thấy món này trong quán của bạn.',
  invalid_food: 'Thông tin món chưa hợp lệ. Vui lòng kiểm tra lại.',
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
  /** Mọi món của quán mình, kể cả món Ngừng bán. */
  const foods = ref([])
  /** 'idle' | 'loading' | 'ready' | 'error' */
  const foodsStatus = ref('idle')

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

  async function loadFoods() {
    foodsStatus.value = 'loading'
    try {
      foods.value = await ownerApi.fetchMyFoods()
      foodsStatus.value = 'ready'
    } catch (err) {
      error.value = ownerErrorMessage(err?.code)
      foodsStatus.value = 'error'
    }
  }

  function foodById(id) {
    return foods.value.find((f) => f.id === Number(id)) ?? null
  }

  /** Lưu form món. Kết quả: { ok: true, id, created } hoặc { ok: false, message }. */
  async function saveFood(form) {
    if (saving.value) return { ok: false, message: '' }
    saving.value = true
    try {
      const result = await ownerApi.saveFood(toFoodPayload(form))
      foods.value = await ownerApi.fetchMyFoods()
      menu.load({ force: true })
      return { ok: true, ...result }
    } catch (err) {
      return { ok: false, message: ownerErrorMessage(err?.code) }
    } finally {
      saving.value = false
    }
  }

  /** Xóa hẳn một món. Kết quả: { ok: true } hoặc { ok: false, message }. */
  async function deleteFood(foodId) {
    try {
      await ownerApi.deleteFood(foodId)
      foods.value = foods.value.filter((f) => f.id !== foodId)
      menu.load({ force: true })
      return { ok: true }
    } catch (err) {
      return { ok: false, message: ownerErrorMessage(err?.code) }
    }
  }

  function reset() {
    restaurant.value = null
    status.value = 'idle'
    error.value = ''
    foods.value = []
    foodsStatus.value = 'idle'
  }

  return {
    restaurant,
    status,
    error,
    saving,
    foods,
    foodsStatus,
    load,
    save,
    loadFoods,
    foodById,
    saveFood,
    deleteFood,
    reset,
  }
})
