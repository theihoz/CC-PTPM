// Chuyển lỗi của Supabase Auth thành thông báo tiếng Việt cho người dùng.

const BY_CODE = {
  user_already_exists: 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
  email_exists: 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
  weak_password: 'Mật khẩu quá yếu. Hãy dùng ít nhất 8 ký tự, có cả chữ và số.',
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_not_confirmed: 'Tài khoản chưa xác nhận email. Hãy mở email xác nhận rồi đăng nhập lại.',
  over_request_rate_limit: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  over_email_send_rate_limit: 'Hệ thống đang gửi quá nhiều email. Vui lòng thử lại sau ít phút.',
  signup_disabled: 'Hiện tạm ngưng đăng ký tài khoản mới.',
  email_address_invalid: 'Email không hợp lệ.',
  validation_failed: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  session_expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
}

export function authErrorMessage(error) {
  if (!error) return ''
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  const message = String(error.message ?? '').toLowerCase()
  if (message.includes('already registered')) return BY_CODE.user_already_exists
  if (message.includes('invalid login credentials')) return BY_CODE.invalid_credentials
  if (message.includes('password')) return BY_CODE.weak_password
  if (error.name === 'AuthRetryableFetchError' || message.includes('fetch'))
    return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
  if (error.code === 'not_configured') return 'Website chưa được cấu hình đăng nhập.'
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}
