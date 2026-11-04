import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useMenuStore } from './menu'
import { lineKey, normalizeSelection, summarize } from '@/lib/cart'
import { unitPrice } from '@/lib/pricing'

/**
 * Giỏ hàng. Chỉ lưu lựa chọn của khách (món, size, topping, độ cay, số lượng);
 * giá và tồn kho luôn tính lại từ thực đơn hiện tại nên không bao giờ lệch.
 *
 * Kết quả của addItem / updateQuantity là một object `{ status, ... }`:
 *   'added' | 'merged' | 'updated' | 'removed'   thành công
 *   'stock'             vượt tồn kho (kèm `remaining`)
 *   'other-restaurant'  giỏ đang có món của quán khác, cần khách xác nhận
 *   'invalid'           món, size hoặc số lượng không hợp lệ
 */
export const useCartStore = defineStore('cart', () => {
  const menu = useMenuStore()

  const restaurantId = ref(null)
  const items = ref([])
  let repository = null
  let unsubscribe = null

  function applyState(state) {
    restaurantId.value = state?.items?.length ? state.restaurantId : null
    items.value = state?.items ? state.items.map((item) => ({ ...item, key: lineKey(item) })) : []
  }

  function persist() {
    if (!repository) return
    const state = {
      restaurantId: restaurantId.value,
      items: items.value.map(({ foodId, sizeId, toppingIds, spiceLevel, quantity }) => ({
        foodId,
        sizeId,
        toppingIds: [...toppingIds],
        spiceLevel,
        quantity,
      })),
    }
    Promise.resolve(repository.save(state)).catch((err) =>
      console.error('[cart] Không lưu được giỏ hàng', err),
    )
  }

  /** Gắn nơi lưu giỏ và nạp giỏ đã lưu. Gọi lại khi đăng nhập/đăng xuất để đổi nơi lưu. */
  async function useRepository(repo) {
    unsubscribe?.()
    repository = repo
    applyState(await repo.load())
    unsubscribe = repo.subscribe?.((state) => applyState(state)) ?? null
  }

  // ── Getter ──────────────────────────────────────────────────────────────
  const quantityByFood = computed(() => {
    const totals = new Map()
    for (const item of items.value) {
      totals.set(item.foodId, (totals.get(item.foodId) ?? 0) + item.quantity)
    }
    return totals
  })

  /** Các dòng kèm dữ liệu món và giá. Dòng có món không còn trong thực đơn bị bỏ qua. */
  const lines = computed(() =>
    items.value
      .map((item) => {
        const food = menu.foodById(item.foodId)
        if (!food) return null
        const price = unitPrice(food, item)
        return {
          ...item,
          food,
          size: food.sizes.find((s) => s.id === item.sizeId) ?? null,
          toppings: food.toppings.filter((t) => item.toppingIds.includes(t.id)),
          unitPrice: price,
          lineTotal: price * item.quantity,
        }
      })
      .filter(Boolean),
  )

  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const isEmpty = computed(() => items.value.length === 0)
  const restaurant = computed(() =>
    restaurantId.value ? menu.restaurantById(restaurantId.value) : null,
  )

  const totals = computed(() => summarize(lines.value.reduce((sum, l) => sum + l.lineTotal, 0)))
  const subtotal = computed(() => totals.value.subtotal)
  const shippingFee = computed(() => totals.value.shippingFee)
  const total = computed(() => totals.value.total)
  const meetsMinimum = computed(() => totals.value.meetsMinimum)
  const amountToMinimum = computed(() => totals.value.amountToMinimum)

  /** Số phần của món còn thêm được = tồn kho − tổng số lượng mọi dòng của món đó trong giỏ. */
  function remainingStock(foodId) {
    const food = menu.foodById(foodId)
    if (!food) return 0
    return Math.max(0, food.stock - (quantityByFood.value.get(Number(foodId)) ?? 0))
  }

  // ── Hành động ───────────────────────────────────────────────────────────
  function addItem({ foodId, sizeId = null, toppingIds = [], spiceLevel = 0, quantity = 1 }) {
    const food = menu.foodById(foodId)
    const amount = Math.trunc(Number(quantity))
    if (!food || !(amount > 0)) return { status: 'invalid' }

    const selection = normalizeSelection(food, { sizeId, toppingIds, spiceLevel })
    if (!selection) return { status: 'invalid' }

    if (items.value.length && restaurantId.value !== food.restaurantId) {
      return {
        status: 'other-restaurant',
        currentRestaurantId: restaurantId.value,
        nextRestaurantId: food.restaurantId,
      }
    }

    const remaining = remainingStock(food.id)
    if (amount > remaining) return { status: 'stock', remaining }

    const key = lineKey(selection)
    const existing = items.value.find((item) => item.key === key)
    if (existing) {
      existing.quantity += amount
    } else {
      items.value.push({ ...selection, quantity: amount, key })
    }
    restaurantId.value = food.restaurantId
    persist()
    return { status: existing ? 'merged' : 'added', key, food }
  }

  /** Xóa giỏ hiện tại rồi thêm món (sau khi khách xác nhận đổi quán). */
  // Kiểm tra trước để không xóa mất giỏ cũ khi món mới không thêm được.
  function replaceWith(selection) {
    const food = menu.foodById(selection.foodId)
    const amount = Math.trunc(Number(selection.quantity ?? 1))
    if (!food || !(amount > 0) || !normalizeSelection(food, selection)) return { status: 'invalid' }
    if (amount > food.stock) return { status: 'stock', remaining: food.stock }
    restaurantId.value = null
    items.value = []
    return addItem(selection)
  }

  /** Đặt số lượng cho một dòng. 0 hoặc nhỏ hơn thì xóa dòng; vượt kho thì giữ ở mức tối đa. */
  function updateQuantity(key, quantity) {
    const item = items.value.find((i) => i.key === key)
    if (!item) return { status: 'invalid' }
    const amount = Math.trunc(Number(quantity))
    if (!Number.isFinite(amount)) return { status: 'invalid' }
    if (amount <= 0) return removeItem(key)

    const max = item.quantity + remainingStock(item.foodId)
    if (amount > max) {
      item.quantity = max
      persist()
      return { status: 'stock', remaining: 0, quantity: max }
    }
    item.quantity = amount
    persist()
    return { status: 'updated', quantity: amount }
  }

  function removeItem(key) {
    const before = items.value.length
    items.value = items.value.filter((item) => item.key !== key)
    if (items.value.length === before) return { status: 'invalid' }
    if (!items.value.length) restaurantId.value = null
    persist()
    return { status: 'removed' }
  }

  function clear() {
    restaurantId.value = null
    items.value = []
    persist()
  }

  return {
    restaurantId,
    items,
    lines,
    itemCount,
    isEmpty,
    restaurant,
    subtotal,
    shippingFee,
    total,
    meetsMinimum,
    amountToMinimum,
    remainingStock,
    useRepository,
    addItem,
    replaceWith,
    updateQuantity,
    removeItem,
    clear,
  }
})
