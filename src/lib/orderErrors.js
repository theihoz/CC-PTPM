import { formatVND } from './format'
import { MIN_ORDER_SUBTOTAL } from './constants'

// Mã lỗi do RPC place_order trả về (xem supabase/migrations/…_orders.sql).
const MESSAGES = {
  not_authenticated: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  empty_cart: 'Giỏ hàng đang trống.',
  invalid_item:
    'Một số món trong giỏ không còn hợp lệ (món ngừng bán hoặc tùy chọn đã thay đổi). Vui lòng kiểm tra lại giỏ.',
  mixed_restaurants: 'Mỗi đơn chỉ đặt từ một quán. Vui lòng kiểm tra lại giỏ.',
  invalid_delivery: 'Thông tin giao hàng chưa hợp lệ. Vui lòng kiểm tra lại.',
  below_minimum: `Đơn tối thiểu ${formatVND(MIN_ORDER_SUBTOTAL)}. Vui lòng thêm món.`,
  out_of_stock: 'Một số món không còn đủ số lượng.',
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  // cancel_order
  order_not_found: 'Không tìm thấy đơn hàng.',
  already_cancelled: 'Đơn này đã được hủy trước đó.',
  too_late: 'Quán đã chuẩn bị xong và giao cho shipper, không thể hủy đơn nữa.',
}

export function orderErrorMessage(code) {
  return MESSAGES[code] ?? 'Không đặt được đơn. Vui lòng thử lại.'
}

/** Câu mô tả một món thiếu hàng, ví dụ "Bún bò Huế: còn 1 phần (bạn chọn 3)". */
export function describeShortage({ name, available, requested }) {
  return available > 0
    ? `${name}: chỉ còn ${available} phần (bạn chọn ${requested})`
    : `${name}: đã hết hàng`
}
