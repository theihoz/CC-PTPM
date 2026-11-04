// Tính giá một món theo tùy chọn. Hàm thuần, dùng chung cho trang chi tiết món và giỏ hàng.
// Server (RPC place_order) tính lại y hệt công thức này; client chỉ hiển thị.
import { SPICE_LEVELS } from './constants'

/** Lựa chọn mặc định khi mở trang món: size mặc định, không topping, không cay, số lượng 1. */
export function defaultSelection(food) {
  const size = food.sizes.find((s) => s.isDefault) ?? food.sizes[0] ?? null
  return { sizeId: size?.id ?? null, toppingIds: [], spiceLevel: 0, quantity: 1 }
}

/** Danh sách topping id duy nhất, sắp xếp tăng dần, chỉ giữ id có thật của món. */
export function normalizeToppingIds(food, toppingIds) {
  const valid = new Set(food.toppings.map((t) => t.id))
  return [...new Set(toppingIds.map(Number))].filter((id) => valid.has(id)).sort((a, b) => a - b)
}

/**
 * Đơn giá một phần = giá gốc + phụ thu size + tổng giá topping. Độ cay không đổi giá.
 * Size hoặc topping không thuộc món thì bị bỏ qua.
 */
export function unitPrice(food, { sizeId = null, toppingIds = [] } = {}) {
  const size = food.sizes.find((s) => s.id === Number(sizeId))
  const toppingTotal = normalizeToppingIds(food, toppingIds).reduce(
    (sum, id) => sum + food.toppings.find((t) => t.id === id).price,
    0,
  )
  return food.basePrice + (size?.priceDelta ?? 0) + toppingTotal
}

/** Thành tiền = đơn giá × số lượng. */
export function lineTotal(food, selection) {
  return unitPrice(food, selection) * Math.max(0, Math.trunc(selection.quantity ?? 1))
}

/** Giới hạn số lượng trong khoảng [1, max]; max = 0 nghĩa là không thêm được. */
export function clampQuantity(quantity, max) {
  if (max <= 0) return 0
  const n = Math.trunc(Number(quantity))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, max)
}

export const SPICE_LABELS = ['Không cay', 'Ít cay', 'Cay vừa', 'Cay', 'Rất cay']

/** Độ cay hợp lệ cho món: món không có tùy chọn cay thì luôn là 0. */
export function normalizeSpice(food, spiceLevel) {
  if (!food.hasSpice) return 0
  const n = Number(spiceLevel)
  return SPICE_LEVELS.includes(n) ? n : 0
}

/** Số lượng tối đa mỗi lần thêm, kể cả khi kho còn nhiều. */
export const MAX_QUANTITY_PER_ADD = 20
