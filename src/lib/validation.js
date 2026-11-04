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
