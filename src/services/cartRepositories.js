// Nơi lưu giỏ hàng. Cart store chỉ biết interface này, không biết dữ liệu nằm ở đâu:
//   load()            → { restaurantId, items } | null
//   save(state)       → lưu toàn bộ giỏ
//   subscribe?(fn)    → báo khi giỏ bị đổi từ nơi khác (tab khác); trả về hàm hủy
// Khách vãng lai dùng LocalStorage; người đã đăng nhập dùng Supabase (ticket #8).

export const CART_STORAGE_KEY = 'foodiego:cart:v1'

/** Chỉ giữ các dòng có hình dạng hợp lệ, phòng dữ liệu cũ hoặc bị sửa tay. */
export function sanitizeCartState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null
  const items = raw.items
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.foodId) &&
        (item.sizeId === null || Number.isInteger(item.sizeId)) &&
        Array.isArray(item.toppingIds) &&
        item.toppingIds.every(Number.isInteger) &&
        Number.isInteger(item.spiceLevel) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    )
    .map(({ foodId, sizeId, toppingIds, spiceLevel, quantity }) => ({
      foodId,
      sizeId,
      toppingIds: [...toppingIds],
      spiceLevel,
      quantity,
    }))
  const restaurantId = Number.isInteger(raw.restaurantId) ? raw.restaurantId : null
  return items.length && restaurantId ? { restaurantId, items } : { restaurantId: null, items: [] }
}

export function createLocalStorageCartRepository(storage = globalThis.localStorage) {
  return {
    load() {
      try {
        return sanitizeCartState(JSON.parse(storage.getItem(CART_STORAGE_KEY)))
      } catch {
        return null
      }
    },
    save(state) {
      try {
        if (state.items.length) storage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
        else storage.removeItem(CART_STORAGE_KEY)
      } catch {
        // Trình duyệt chặn lưu trữ (chế độ riêng tư, đầy bộ nhớ): giỏ vẫn chạy trong phiên.
      }
    },
    subscribe(callback) {
      if (typeof window === 'undefined') return () => {}
      const onStorage = (event) => {
        if (event.key === CART_STORAGE_KEY) callback(this.load())
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  }
}

/** Repository trong bộ nhớ, dùng cho test. */
export function createMemoryCartRepository(initial = null) {
  let stored = initial ? structuredClone(initial) : null
  return {
    saves: 0,
    load() {
      return stored ? structuredClone(stored) : null
    },
    save(state) {
      this.saves += 1
      stored = structuredClone(state)
    },
    peek() {
      return stored
    },
  }
}
