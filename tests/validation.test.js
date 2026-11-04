import { describe, expect, it } from 'vitest'
import {
  normalizePhone,
  safeRedirect,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhone,
} from '@/lib/validation'
import { authErrorMessage } from '@/lib/authErrors'

describe('kiểm tra form', () => {
  it('email', () => {
    expect(validateEmail('')).toBe('Vui lòng nhập email.')
    expect(validateEmail('abc')).toBe('Email không hợp lệ.')
    expect(validateEmail(' an@vd.com ')).toBe('')
  })

  it('mật khẩu: ít nhất 8 ký tự, có chữ và số', () => {
    expect(validatePassword('')).toBe('Vui lòng nhập mật khẩu.')
    expect(validatePassword('abc123')).toContain('ít nhất 8')
    expect(validatePassword('abcdefgh')).toContain('chữ và số')
    expect(validatePassword('12345678')).toContain('chữ và số')
    expect(validatePassword('matkhau123')).toBe('')
  })

  it('họ tên', () => {
    expect(validateFullName('  ')).toBe('Vui lòng nhập họ tên.')
    expect(validateFullName('A')).toBe('Họ tên quá ngắn.')
    expect(validateFullName('Nguyễn Văn A')).toBe('')
  })

  it('số điện thoại Việt Nam, chấp nhận khoảng trắng, dấu chấm và +84', () => {
    expect(normalizePhone('090 123.4567')).toBe('0901234567')
    expect(normalizePhone('+84 901 234 567')).toBe('0901234567')
    expect(validatePhone('0901234567')).toBe('')
    expect(validatePhone('+84901234567')).toBe('')
    expect(validatePhone('0201234567')).toContain('không hợp lệ')
    expect(validatePhone('09012345')).toContain('không hợp lệ')
    expect(validatePhone('')).toBe('Vui lòng nhập số điện thoại.')
  })
})

describe('safeRedirect', () => {
  it('chỉ cho phép đường dẫn nội bộ', () => {
    expect(safeRedirect('/checkout?x=1')).toBe('/checkout?x=1')
    expect(safeRedirect('https://evil.com')).toBe('/')
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(['/account'])).toBe('/account')
  })

  it('không quay lại trang đăng nhập hay đăng ký', () => {
    expect(safeRedirect('/login')).toBe('/')
    expect(safeRedirect('/register?redirect=/cart')).toBe('/')
  })
})

describe('authErrorMessage', () => {
  it('dịch các lỗi thường gặp sang tiếng Việt', () => {
    expect(authErrorMessage({ code: 'user_already_exists' })).toContain('đã được đăng ký')
    expect(authErrorMessage({ code: 'weak_password' })).toContain('quá yếu')
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe(
      'Email hoặc mật khẩu không đúng.',
    )
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Email hoặc mật khẩu không đúng.',
    )
    expect(
      authErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }),
    ).toContain('Không kết nối')
    expect(authErrorMessage({ message: 'lạ' })).toBe('Đã có lỗi xảy ra. Vui lòng thử lại.')
  })
})
