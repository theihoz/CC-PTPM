import { describe, expect, it } from 'vitest'
import {
  FREE_SHIPPING_THRESHOLD,
  MIN_ORDER_SUBTOTAL,
  SHIPPING_FEE,
  shippingFeeFor,
} from '@/lib/constants'

describe('quy tắc phí giao hàng', () => {
  it('dùng đúng các mức của spec', () => {
    expect(SHIPPING_FEE).toBe(15_000)
    expect(FREE_SHIPPING_THRESHOLD).toBe(200_000)
    expect(MIN_ORDER_SUBTOTAL).toBe(50_000)
  })

  it('tính phí ship khi tạm tính dưới ngưỡng', () => {
    expect(shippingFeeFor(199_999)).toBe(15_000)
  })

  it('miễn phí ship từ đúng ngưỡng trở lên', () => {
    expect(shippingFeeFor(200_000)).toBe(0)
    expect(shippingFeeFor(350_000)).toBe(0)
  })
})
