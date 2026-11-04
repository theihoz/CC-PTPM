// Trạng thái giao hàng được SUY RA từ thời gian kể từ lúc đặt, không lưu trong database.
// Nhờ vậy tải lại trang hay mở trên máy khác vẫn thấy đúng trạng thái.
// Mốc thời gian ngắn để demo được trước hội đồng; RPC cancel_order (ticket #11)
// dùng cùng mốc PREPARING_MS để quyết định còn hủy được hay không.

/** 0 → 30 giây: quán đang chuẩn bị (còn hủy được). */
export const PREPARING_MS = 30_000
/** 30 → 90 giây: shipper đang giao. Sau đó: đã giao. */
export const DELIVERING_MS = 90_000

export const ORDER_STATUS = {
  preparing: { label: 'Đang chuẩn bị', icon: '👨‍🍳', tone: 'amber' },
  delivering: { label: 'Đang giao', icon: '🛵', tone: 'sky' },
  delivered: { label: 'Đã giao', icon: '✅', tone: 'emerald' },
  cancelled: { label: 'Đã hủy', icon: '✖️', tone: 'stone' },
}

/** Các bước hiển thị trên thanh tiến trình. */
export const ORDER_STEPS = ['preparing', 'delivering', 'delivered']

const toTime = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime())

/**
 * @param order  { created_at, cancelled_at } (đúng tên cột trong database)
 * @param now    Date hoặc số mili giây
 * @returns {{
 *   status: 'preparing' | 'delivering' | 'delivered' | 'cancelled',
 *   progress: number,     // 0 → 1 trên toàn bộ hành trình
 *   canCancel: boolean,   // chỉ khi đang chuẩn bị
 *   msToNext: number,     // còn bao lâu tới bước tiếp theo; 0 nếu đã xong
 * }}
 */
export function orderStatus(order, now = Date.now()) {
  if (order.cancelled_at) {
    return { status: 'cancelled', progress: 0, canCancel: false, msToNext: 0 }
  }
  const elapsed = Math.max(0, toTime(now) - toTime(order.created_at))
  const progress = Math.min(1, elapsed / DELIVERING_MS)

  if (elapsed < PREPARING_MS) {
    return { status: 'preparing', progress, canCancel: true, msToNext: PREPARING_MS - elapsed }
  }
  if (elapsed < DELIVERING_MS) {
    return { status: 'delivering', progress, canCancel: false, msToNext: DELIVERING_MS - elapsed }
  }
  return { status: 'delivered', progress: 1, canCancel: false, msToNext: 0 }
}

/** "còn 25 giây", "còn 1 phút 5 giây". */
export function formatRemaining(ms) {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes ? `còn ${minutes} phút ${seconds} giây` : `còn ${seconds} giây`
}
