/** Phí giao hàng cố định (VND). */
export const SHIPPING_FEE = 15_000

/** Tạm tính từ mức này trở lên thì miễn phí giao hàng (VND). */
export const FREE_SHIPPING_THRESHOLD = 200_000

/** Giá trị đơn tối thiểu để được đặt hàng (VND). */
export const MIN_ORDER_SUBTOTAL = 50_000

/** Độ cay hợp lệ: 0 (không cay) đến 4 (rất cay). */
export const SPICE_LEVELS = [0, 1, 2, 3, 4]

/** Phí giao hàng cho một mức tạm tính. */
export function shippingFeeFor(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
}
