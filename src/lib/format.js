const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

/** Định dạng số tiền theo kiểu Việt Nam, ví dụ 45000 → "45.000 ₫". */
export function formatVND(amount) {
  return vndFormatter.format(amount)
}
