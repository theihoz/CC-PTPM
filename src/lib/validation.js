// Kiểm tra dữ liệu form. Mỗi hàm trả về chuỗi lỗi tiếng Việt, hoặc '' nếu hợp lệ.

export const PASSWORD_MIN_LENGTH = 8

/** Số di động Việt Nam: bỏ khoảng trắng, dấu chấm, gạch; +84 đổi thành 0. */
export function normalizePhone(value) {
  const digits = String(value ?? '')
    .trim()
    .replace(/[\s.-]/g, '')
  return digits.startsWith('+84') ? `0${digits.slice(3)}` : digits
}

export function validateEmail(value) {
  const email = String(value ?? '').trim()
  if (!email) return 'Vui lòng nhập email.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Email không hợp lệ.'
  return ''
}

export function validatePassword(value) {
  const password = String(value ?? '')
  if (!password) return 'Vui lòng nhập mật khẩu.'
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Mật khẩu cần có cả chữ và số.'
  return ''
}

export function validateFullName(value) {
  const name = String(value ?? '').trim()
  if (!name) return 'Vui lòng nhập họ tên.'
  if (name.length < 2) return 'Họ tên quá ngắn.'
  if (name.length > 100) return 'Họ tên tối đa 100 ký tự.'
  return ''
}

export function validatePhone(value) {
  const phone = normalizePhone(value)
  if (!phone) return 'Vui lòng nhập số điện thoại.'
  if (!/^0[35789][0-9]{8}$/.test(phone))
    return 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).'
  return ''
}

/** Chỉ cho phép quay về đường dẫn nội bộ, chặn chuyển hướng ra trang ngoài. */
export function safeRedirect(value, fallback = '/') {
  const path = Array.isArray(value) ? value[0] : value
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback
  if (path.startsWith('/login') || path.startsWith('/register')) return fallback
  return path
}

export function validateAddress(value) {
  const address = String(value ?? '').trim()
  if (!address) return 'Vui lòng nhập địa chỉ giao hàng.'
  if (address.length < 5) return 'Địa chỉ quá ngắn, hãy ghi rõ số nhà, đường, quận.'
  if (address.length > 300) return 'Địa chỉ tối đa 300 ký tự.'
  return ''
}

export function validateNote(value) {
  return String(value ?? '').length > 300 ? 'Ghi chú tối đa 300 ký tự.' : ''
}

/** Kiểm tra thông tin giao hàng; trả về object lỗi theo từng trường ('' là hợp lệ). */
export function validateDelivery({ recipientName, phone, address, note }) {
  return {
    recipientName: validateFullName(recipientName),
    phone: validatePhone(phone),
    address: validateAddress(address),
    note: validateNote(note),
  }
}

export const RESTAURANT_NAME_MAX = 80
export const RESTAURANT_DESCRIPTION_MAX = 300
export const IMAGE_URL_MAX = 500

/** URL ảnh: để trống, hoặc https:// tối đa 500 ký tự. */
export function validateImageUrl(value) {
  const url = String(value ?? '').trim()
  if (!url) return ''
  if (url.length > IMAGE_URL_MAX) return `Đường dẫn ảnh tối đa ${IMAGE_URL_MAX} ký tự.`
  if (!/^https:\/\/[^\s]+$/.test(url)) return 'Đường dẫn ảnh phải bắt đầu bằng https://'
  return ''
}

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

/** Kiểm tra form thông tin quán; trả về object lỗi theo từng trường ('' là hợp lệ). */
export function validateRestaurant(
  { name, description, imageUrl, address, categoryId, openTime, closeTime, deliveryTimeMin },
  categoryIds = [],
) {
  const trimmedName = String(name ?? '').trim()
  const delivery = Number(deliveryTimeMin)
  return {
    name: !trimmedName
      ? 'Vui lòng nhập tên quán.'
      : trimmedName.length < 2
        ? 'Tên quán quá ngắn.'
        : trimmedName.length > RESTAURANT_NAME_MAX
          ? `Tên quán tối đa ${RESTAURANT_NAME_MAX} ký tự.`
          : '',
    description:
      String(description ?? '').trim().length > RESTAURANT_DESCRIPTION_MAX
        ? `Mô tả tối đa ${RESTAURANT_DESCRIPTION_MAX} ký tự.`
        : '',
    imageUrl: validateImageUrl(imageUrl),
    address: validateAddress(address).replace('địa chỉ giao hàng', 'địa chỉ quán'),
    categoryId: categoryIds.includes(Number(categoryId)) ? '' : 'Vui lòng chọn danh mục.',
    openTime: TIME_PATTERN.test(openTime ?? '') ? '' : 'Giờ mở cửa không hợp lệ.',
    closeTime: TIME_PATTERN.test(closeTime ?? '') ? '' : 'Giờ đóng cửa không hợp lệ.',
    deliveryTimeMin:
      Number.isInteger(delivery) && delivery >= 5 && delivery <= 180
        ? ''
        : 'Thời gian giao từ 5 đến 180 phút.',
  }
}

/** true khi object lỗi không còn trường nào báo lỗi. */
export function isValid(errors) {
  return Object.values(errors).every((message) => !message)
}
