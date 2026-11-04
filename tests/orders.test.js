import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'
import { describeShortage, orderErrorMessage } from '@/lib/orderErrors'
import { validateDelivery } from '@/lib/validation'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: (...a) => rpc(...a) },
}))

const { OrderError, placeOrder: apiPlaceOrder } = await import('@/services/orderApi')
const orderApi = await import('@/services/orderApi')
const { useMenuStore } = await import('@/stores/menu')
const { useCartStore } = await import('@/stores/cart')
const { useOrdersStore } = await import('@/stores/orders')
const { createMemoryCartRepository } = await import('@/services/cartRepositories')

const menuData = normalizeMenu(nestedMenuRows())
const pho = menuData.restaurants[0].foods.find((f) => f.name === 'Phở bò tái')
const delivery = {
  recipientName: ' Người Thử ',
  phone: '090 123 4567',
  address: ' 12 Lê Lợi, Quận 1 ',
  note: '',
}

describe('validateDelivery', () => {
  it('báo lỗi từng trường, rỗng khi hợp lệ', () => {
    expect(validateDelivery({ recipientName: '', phone: '123', address: 'x', note: '' })).toEqual({
      recipientName: 'Vui lòng nhập họ tên.',
      phone: expect.stringContaining('không hợp lệ'),
      address: expect.stringContaining('quá ngắn'),
      note: '',
    })
    expect(Object.values(validateDelivery(delivery)).every((e) => e === '')).toBe(true)
    expect(validateDelivery({ ...delivery, note: 'x'.repeat(301) }).note).toContain('300')
  })
})

describe('thông báo lỗi đặt hàng', () => {
  it('dịch mã lỗi của place_order', () => {
    expect(orderErrorMessage('below_minimum')).toContain('50.000')
    expect(orderErrorMessage('mixed_restaurants')).toContain('một quán')
    expect(orderErrorMessage('lạ')).toBe('Không đặt được đơn. Vui lòng thử lại.')
  })

  it('mô tả món thiếu hàng', () => {
    expect(describeShortage({ name: 'Bún bò Huế', available: 1, requested: 3 })).toBe(
      'Bún bò Huế: chỉ còn 1 phần (bạn chọn 3)',
    )
    expect(describeShortage({ name: 'Mì xào', available: 0, requested: 1 })).toBe(
      'Mì xào: đã hết hàng',
    )
  })
})

describe('orderApi.placeOrder', () => {
  beforeEach(() => rpc.mockReset())

  it('gọi RPC place_order và trả về đơn', async () => {
    rpc.mockResolvedValue({ data: { id: 'o1', code: 'FD-261104-0001', total: 85000 }, error: null })
    const order = await apiPlaceOrder([{ foodId: 1 }], { recipientName: 'A' })
    expect(rpc).toHaveBeenCalledWith('place_order', {
      items: [{ foodId: 1 }],
      delivery: { recipientName: 'A' },
    })
    expect(order.code).toBe('FD-261104-0001')
  })

  it('đọc danh sách món thiếu hàng từ details', async () => {
    const shortages = [{ foodId: 2, name: 'Bún bò Huế', requested: 4, available: 3 }]
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'out_of_stock', details: JSON.stringify(shortages) },
    })
    await expect(apiPlaceOrder([], {})).rejects.toMatchObject({ code: 'out_of_stock', shortages })
  })

  it('lỗi lạ coi như lỗi mạng', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } })
    await expect(apiPlaceOrder([], {})).rejects.toMatchObject({ code: 'network' })
  })
})

describe('orders store', () => {
  let cart
  let menu
  let orders

  beforeEach(async () => {
    setActivePinia(createPinia())
    menu = useMenuStore()
    menu.categories = menuData.categories
    menu.restaurants = menuData.restaurants
    menu.status = 'ready'
    menu.load = vi.fn().mockResolvedValue()
    cart = useCartStore()
    await cart.useRepository(createMemoryCartRepository())
    orders = useOrdersStore()
  })

  it('chỉ gửi lựa chọn (không có giá) và thông tin giao hàng đã chuẩn hóa', async () => {
    const spy = vi
      .spyOn(orderApi, 'placeOrder')
      .mockResolvedValue({ id: 'o1', code: 'FD', total: 1 })
    cart.addItem({
      foodId: pho.id,
      sizeId: pho.sizes[1].id,
      toppingIds: [pho.toppings[1].id],
      quantity: 2,
    })

    const result = await orders.placeOrder(delivery)

    expect(result).toEqual({ ok: true, order: { id: 'o1', code: 'FD', total: 1 } })
    const [items, sentDelivery] = spy.mock.calls[0]
    expect(items).toEqual([
      {
        foodId: pho.id,
        sizeId: pho.sizes[1].id,
        toppingIds: [pho.toppings[1].id],
        spiceLevel: 0,
        quantity: 2,
      },
    ])
    expect(JSON.stringify(items)).not.toMatch(/price|total/i)
    expect(sentDelivery).toEqual({
      recipientName: 'Người Thử',
      phone: '0901234567',
      address: '12 Lê Lợi, Quận 1',
      note: '',
    })
  })

  it('thành công thì giỏ trống và tải lại thực đơn (tồn kho đã đổi)', async () => {
    vi.spyOn(orderApi, 'placeOrder').mockResolvedValue({ id: 'o1', code: 'FD', total: 1 })
    cart.addItem({ foodId: pho.id })
    await orders.placeOrder(delivery)
    expect(cart.isEmpty).toBe(true)
    expect(menu.load).toHaveBeenCalledWith({ force: true })
  })

  it('thiếu hàng: giữ giỏ, trả về món thiếu và thông báo tiếng Việt', async () => {
    const shortages = [{ foodId: pho.id, name: 'Phở bò tái', requested: 3, available: 1 }]
    vi.spyOn(orderApi, 'placeOrder').mockRejectedValue(
      new OrderError('out_of_stock', { shortages }),
    )
    cart.addItem({ foodId: pho.id, quantity: 3 })

    const result = await orders.placeOrder(delivery)

    expect(result).toEqual({
      ok: false,
      code: 'out_of_stock',
      message: 'Một số món không còn đủ số lượng.',
      shortages,
    })
    expect(cart.itemCount).toBe(3)
    expect(menu.load).toHaveBeenCalledWith({ force: true })
  })

  it('không gửi hai lần khi đang đặt', async () => {
    let resolve
    const spy = vi.spyOn(orderApi, 'placeOrder').mockReturnValue(new Promise((r) => (resolve = r)))
    cart.addItem({ foodId: pho.id })
    const first = orders.placeOrder(delivery)
    expect(orders.placing).toBe(true)
    expect((await orders.placeOrder(delivery)).code).toBe('busy')
    resolve({ id: 'o1', code: 'FD', total: 1 })
    await first
    expect(spy).toHaveBeenCalledTimes(1)
    expect(orders.placing).toBe(false)
  })
})

describe('hủy đơn', () => {
  beforeEach(() => {
    rpc.mockReset()
    setActivePinia(createPinia())
    const menu = useMenuStore()
    menu.load = vi.fn().mockResolvedValue()
  })

  it('gọi RPC cancel_order với id đơn', async () => {
    rpc.mockResolvedValue({ data: { id: 'o1', cancelledAt: '2026-11-04T12:00:10Z' }, error: null })
    expect(await orderApi.cancelOrder('o1')).toEqual({
      id: 'o1',
      cancelledAt: '2026-11-04T12:00:10Z',
    })
    expect(rpc).toHaveBeenCalledWith('cancel_order', { order_id: 'o1' })
  })

  it('đọc mã lỗi nghiệp vụ, lỗi lạ coi như lỗi mạng', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'too_late' } })
    await expect(orderApi.cancelOrder('o1')).rejects.toMatchObject({ code: 'too_late' })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    await expect(orderApi.cancelOrder('o1')).rejects.toMatchObject({ code: 'network' })
  })

  it('store: thành công trả về thời điểm hủy và tải lại tồn kho', async () => {
    rpc.mockResolvedValue({ data: { id: 'o1', cancelledAt: 'T' }, error: null })
    const orders = useOrdersStore()
    expect(await orders.cancelOrder('o1')).toEqual({ ok: true, cancelledAt: 'T' })
    expect(useMenuStore().load).toHaveBeenCalledWith({ force: true })
    expect(orders.cancelling).toBe(false)
  })

  it('store: quá giờ thì báo lỗi tiếng Việt', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'too_late' } })
    const result = await useOrdersStore().cancelOrder('o1')
    expect(result).toEqual({
      ok: false,
      code: 'too_late',
      message: orderErrorMessage('too_late'),
    })
    expect(result.message).toContain('không thể hủy')
  })
})
