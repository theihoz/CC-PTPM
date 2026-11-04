// Quy tắc thuần của giỏ hàng: khóa dòng, chuẩn hóa lựa chọn, tổng tiền.
import { MIN_ORDER_SUBTOTAL, shippingFeeFor } from './constants'
import { SPICE_LABELS, normalizeSpice, normalizeToppingIds } from './pricing'

/**
 * Khóa của một dòng giỏ hàng. Hai lựa chọn chỉ gộp làm một dòng khi trùng
 * cả món, size, bộ topping (không kể thứ tự chọn) và độ cay.
 */
export function lineKey({ foodId, sizeId, toppingIds = [], spiceLevel = 0 }) {
  const toppings = [...toppingIds].map(Number).sort((a, b) => a - b)
  return [foodId, sizeId ?? 0, toppings.join('-') || '_', spiceLevel ?? 0].join(':')
}

/**
 * Chuẩn hóa lựa chọn của khách theo dữ liệu món: size phải thuộc món
 * (không có thì lấy size mặc định), topping lọc và sắp xếp, độ cay hợp lệ.
 * Trả về null nếu size không thuộc món.
 */
export function normalizeSelection(food, { sizeId = null, toppingIds = [], spiceLevel = 0 }) {
  let size = null
  if (food.sizes.length) {
    size =
      sizeId == null
        ? (food.sizes.find((s) => s.isDefault) ?? food.sizes[0])
        : food.sizes.find((s) => s.id === Number(sizeId))
    if (!size) return null
  }
  return {
    foodId: food.id,
    sizeId: size?.id ?? null,
    toppingIds: normalizeToppingIds(food, toppingIds),
    spiceLevel: normalizeSpice(food, spiceLevel),
  }
}

/** Phí ship, tổng tiền và điều kiện đơn tối thiểu từ tạm tính. Giỏ trống thì không tính phí ship. */
export function summarize(subtotal) {
  const shippingFee = subtotal > 0 ? shippingFeeFor(subtotal) : 0
  return {
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    meetsMinimum: subtotal >= MIN_ORDER_SUBTOTAL,
    amountToMinimum: Math.max(0, MIN_ORDER_SUBTOTAL - subtotal),
  }
}

/** Mô tả tùy chọn của một dòng, ví dụ "Lớn · Thêm bò tái, Quẩy · Cay vừa". */
export function describeOptions(line) {
  const parts = []
  if (line.size && line.food.sizes.length > 1) parts.push(line.size.name)
  if (line.toppings.length) parts.push(line.toppings.map((t) => t.name).join(', '))
  if (line.food.hasSpice) parts.push(SPICE_LABELS[line.spiceLevel] ?? '')
  return parts.filter(Boolean).join(' · ')
}

const isEmptyCart = (state) => !state || !state.items?.length

/**
 * Gộp giỏ trên máy (khách vãng lai) vào giỏ của tài khoản khi đăng nhập.
 * - Một bên trống: lấy bên còn lại.
 * - Cùng quán: dòng trùng khóa cộng dồn; tổng mỗi món không vượt tồn kho
 *   (giữ phần của giỏ tài khoản trước, rồi mới thêm phần trên máy).
 * - Khác quán: không tự gộp, trả về 'conflict' để hỏi khách giữ giỏ nào.
 * @param stockOf (foodId) => tồn kho hiện tại; món không còn bán trả về 0.
 */
export function mergeCarts(local, remote, stockOf) {
  const empty = { restaurantId: null, items: [] }
  if (isEmptyCart(local) && isEmptyCart(remote)) return { status: 'merged', state: empty }
  if (isEmptyCart(local)) return { status: 'merged', state: remote }
  if (isEmptyCart(remote)) return { status: 'merged', state: capToStock(local, stockOf) }
  if (local.restaurantId !== remote.restaurantId) return { status: 'conflict', local, remote }

  const byKey = new Map()
  for (const item of [...remote.items, ...local.items]) {
    const key = lineKey(item)
    const existing = byKey.get(key)
    if (existing) existing.quantity += item.quantity
    else byKey.set(key, { ...item, toppingIds: [...item.toppingIds] })
  }
  return {
    status: 'merged',
    state: capToStock({ restaurantId: remote.restaurantId, items: [...byKey.values()] }, stockOf),
  }
}

/** Cắt số lượng theo tồn kho, theo thứ tự các dòng; dòng về 0 thì bỏ. */
export function capToStock(state, stockOf) {
  const used = new Map()
  const items = []
  for (const item of state.items) {
    const left = Math.max(0, stockOf(item.foodId) - (used.get(item.foodId) ?? 0))
    const quantity = Math.min(item.quantity, left)
    if (quantity <= 0) continue
    used.set(item.foodId, (used.get(item.foodId) ?? 0) + quantity)
    items.push({ ...item, quantity })
  }
  return items.length
    ? { restaurantId: state.restaurantId, items }
    : { restaurantId: null, items: [] }
}
