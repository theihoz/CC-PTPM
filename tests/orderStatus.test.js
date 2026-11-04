import { describe, expect, it } from 'vitest'
import { formatRemaining, orderStatus } from '@/lib/orderStatus'

const created = '2026-11-04T12:00:00.000Z'
const at = (seconds) => new Date(Date.parse(created) + seconds * 1000)
const order = { created_at: created, cancelled_at: null }

describe('orderStatus', () => {
  it('0 giây: đang chuẩn bị, hủy được', () => {
    expect(orderStatus(order, at(0))).toEqual({
      status: 'preparing',
      progress: 0,
      canCancel: true,
      msToNext: 30_000,
    })
  })

  it('29 giây: vẫn đang chuẩn bị', () => {
    const s = orderStatus(order, at(29))
    expect(s.status).toBe('preparing')
    expect(s.canCancel).toBe(true)
    expect(s.msToNext).toBe(1_000)
  })

  it('30 giây: chuyển sang đang giao, không hủy được nữa', () => {
    const s = orderStatus(order, at(30))
    expect(s.status).toBe('delivering')
    expect(s.canCancel).toBe(false)
    expect(s.progress).toBeCloseTo(1 / 3)
  })

  it('89 giây: vẫn đang giao', () => {
    expect(orderStatus(order, at(89)).status).toBe('delivering')
  })

  it('90 giây trở đi: đã giao', () => {
    expect(orderStatus(order, at(90))).toEqual({
      status: 'delivered',
      progress: 1,
      canCancel: false,
      msToNext: 0,
    })
    expect(orderStatus(order, at(3600)).status).toBe('delivered')
  })

  it('đơn đã hủy luôn là cancelled, kể cả khi còn trong 30 giây đầu', () => {
    const cancelled = { created_at: created, cancelled_at: at(10).toISOString() }
    expect(orderStatus(cancelled, at(15))).toEqual({
      status: 'cancelled',
      progress: 0,
      canCancel: false,
      msToNext: 0,
    })
  })

  it('đồng hồ máy khách lệch về trước giờ đặt thì coi như vừa đặt', () => {
    expect(orderStatus(order, at(-5))).toMatchObject({ status: 'preparing', progress: 0 })
  })

  it('nhận now dạng số mili giây', () => {
    expect(orderStatus(order, at(45).getTime()).status).toBe('delivering')
  })
})

describe('formatRemaining', () => {
  it('làm tròn lên theo giây', () => {
    expect(formatRemaining(24_100)).toBe('còn 25 giây')
    expect(formatRemaining(65_000)).toBe('còn 1 phút 5 giây')
  })
})
