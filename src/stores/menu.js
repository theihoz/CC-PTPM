import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchMenu } from '@/services/menuApi'
import { filterRestaurants } from '@/lib/menu'

export const useMenuStore = defineStore('menu', () => {
  const categories = ref([])
  const restaurants = ref([])
  /** 'idle' | 'loading' | 'ready' | 'error' */
  const status = ref('idle')
  const error = ref(null)
  let inflight = null

  /** Tải thực đơn một lần; gọi lại khi đã có dữ liệu thì bỏ qua, trừ khi force. */
  function load({ force = false } = {}) {
    if (status.value === 'ready' && !force) return Promise.resolve()
    if (inflight) return inflight

    status.value = 'loading'
    error.value = null
    inflight = fetchMenu()
      .then((menu) => {
        categories.value = menu.categories
        restaurants.value = menu.restaurants
        status.value = 'ready'
      })
      .catch((err) => {
        error.value = err
        status.value = 'error'
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  const restaurantMap = computed(() => new Map(restaurants.value.map((r) => [r.id, r])))
  const categoryMap = computed(() => new Map(categories.value.map((c) => [c.id, c])))
  const foods = computed(() => restaurants.value.flatMap((r) => r.foods))

  // Quán Tạm đóng vẫn mở được bằng link trực tiếp, nhưng không hiện ở danh sách,
  // trang chủ hay gợi ý AI.
  const openRestaurants = computed(() => restaurants.value.filter((r) => r.isOpen))
  const orderableFoods = computed(() => openRestaurants.value.flatMap((r) => r.foods))

  const featuredRestaurants = computed(() =>
    openRestaurants.value.filter((r) => r.isFeatured).sort((a, b) => b.rating - a.rating),
  )

  const featuredFoods = computed(() => orderableFoods.value.filter((f) => f.isFeatured))

  function restaurantById(id) {
    return restaurantMap.value.get(Number(id)) ?? null
  }

  function categoryById(id) {
    return categoryMap.value.get(Number(id)) ?? null
  }

  function foodById(id) {
    return foods.value.find((f) => f.id === Number(id)) ?? null
  }

  function searchRestaurants(params) {
    return filterRestaurants(openRestaurants.value, categories.value, params)
  }

  return {
    categories,
    restaurants,
    status,
    error,
    load,
    foods,
    openRestaurants,
    orderableFoods,
    featuredRestaurants,
    featuredFoods,
    restaurantById,
    categoryById,
    foodById,
    searchRestaurants,
  }
})
