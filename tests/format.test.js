import { describe, expect, it } from 'vitest'
import { formatVND } from '@/lib/format'

// Intl dùng khoảng trắng không ngắt (U+00A0) trước ký hiệu ₫.
const normalize = (s) => s.replace(/\s/g, ' ')

describe('formatVND', () => {
  it('định dạng hàng nghìn bằng dấu chấm và ký hiệu ₫', () => {
    expect(normalize(formatVND(45_000))).toBe('45.000 ₫')
    expect(normalize(formatVND(1_250_000))).toBe('1.250.000 ₫')
  })

  it('hiển thị 0 ₫ cho số 0', () => {
    expect(normalize(formatVND(0))).toBe('0 ₫')
  })
})
