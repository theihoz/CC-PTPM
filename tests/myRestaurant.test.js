import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'
import { slugify } from '@/lib/slug'
import { isValid, validateImageUrl, validateRestaurant } from '@/lib/validation'
import { orderErrorMessage } from '@/lib/orderErrors'

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: (...a) => rpc(...a) },
}))
vi.mock('@/services/menuApi', () => ({ fetchMenu: vi.fn() }))

const { fetchMenu } = await import('@/services/menuApi')
const { useMenuStore } = await import('@/stores/menu')
const { useMyRestaurantStore } = await import('@/stores/myRestaurant')

const form = {
  name: '  Bún Chả Hà Nội  ',
  description: 'Bún chả nướng than',
  imageUrl: '',
  address: '12 Lê Lợi, Quận 1',
  categoryId: '1',
  openTime: '07:00',
  closeTime: '21:30',
  deliveryTimeMin: '25',
  isOpen: true,
}

describe('slugify', () => {
  it('bỏ dấu tiếng Việt, chữ thường, nối bằng gạch ngang', () => {
    expect(slugify('Bún Chả Hà Nội!')).toBe('bun-cha-ha-noi')
    expect(slugify('  Đồ ăn   vặt -- Cô Ba  ')).toBe('do-an-vat-co-ba')
    expect(slugify('Phở 24/7')).toBe('pho-24-7')
  })

  it('tên không có chữ hay số thì dùng "quan"; tối đa 60 ký tự, không kết thúc bằng gạch', () => {
    expect(slugify('!!! ???')).toBe('quan')
    const long = slugify('a'.repeat(59) + ' bcd')
    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith('-')).toBe(false)
  })
})

describe('validateRestaurant', () => {
  it('hợp lệ với form đầy đủ', () => {
    expect(isValid(validateRestaurant(form, [1, 2]))).toBe(true)
  })

  it('báo lỗi từng trường', () => {
    const errors = validateRestaurant(
      {
        name: 'a',
        description: 'x'.repeat(301),
        imageUrl: 'http://anh.jpg',
        address: '',
        categoryId: '9',
        openTime: '25:00',
        closeTime: '',
        deliveryTimeMin: '2',
      },
      [1, 2],
    )
    expect(errors).toEqual({
      name: 'Tên quán quá ngắn.',
      description: 'Mô tả tối đa 300 ký tự.',
      imageUrl: 'Đường dẫn ảnh phải bắt đầu bằng https://',
      address: 'Vui lòng nhập địa chỉ quán.',
      categoryId: 'Vui lòng chọn danh mục.',
      openTime: 'Giờ mở cửa không hợp lệ.',
      closeTime: 'Giờ đóng cửa không hợp lệ.',
      deliveryTimeMin: 'Thời gian giao từ 5 đến 180 phút.',
    })
    expect(validateRestaurant({ ...form, name: 'x'.repeat(81) }, [1]).name).toContain('80')
  })

  it('ảnh được để trống, nhưng không nhận javascript: hay URL quá dài', () => {
    expect(validateImageUrl('')).toBe('')
    expect(validateImageUrl('https://images.unsplash.com/photo-1')).toBe('')
    expect(validateImageUrl('javascript:alert(1)')).not.toBe('')
    expect(validateImageUrl(`https://${'a'.repeat(500)}`)).toContain('500')
  })
})

describe('my restaurant store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rpc.mockReset()
    fetchMenu.mockReset()
    fetchMenu.mockResolvedValue(normalizeMenu(nestedMenuRows()))
  })

  it('chưa có quán thì restaurant là null', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    const owner = useMyRestaurantStore()
    await owner.load()
    expect(rpc).toHaveBeenCalledWith('my_restaurant')
    expect(owner.status).toBe('ready')
    expect(owner.restaurant).toBeNull()
  })

  it('đăng ký quán: gửi slug sinh từ tên, không gửi rating hay owner, rồi tải lại thực đơn', async () => {
    const row = {
      id: 9,
      slug: 'bun-cha-ha-noi',
      name: 'Bún Chả Hà Nội',
      description: 'Bún chả nướng than',
      image_url: null,
      address: '12 Lê Lợi, Quận 1',
      category_id: 1,
      delivery_time_min: 25,
      open_time: '07:00:00',
      close_time: '21:30:00',
      is_open: true,
      rating: 0,
      rating_count: 0,
    }
    rpc.mockImplementation(async (name) =>
      name === 'save_my_restaurant'
        ? { data: { id: 9, slug: 'bun-cha-ha-noi', created: true }, error: null }
        : { data: [row], error: null },
    )
    const owner = useMyRestaurantStore()
    const result = await owner.save(form)

    expect(result).toEqual({ ok: true, created: true })
    const payload = rpc.mock.calls.find(([name]) => name === 'save_my_restaurant')[1].payload
    expect(payload).toEqual({
      name: 'Bún Chả Hà Nội',
      slug: 'bun-cha-ha-noi',
      description: 'Bún chả nướng than',
      imageUrl: '',
      address: '12 Lê Lợi, Quận 1',
      categoryId: 1,
      openTime: '07:00',
      closeTime: '21:30',
      deliveryTimeMin: 25,
      isOpen: true,
    })
    expect(owner.restaurant).toMatchObject({ id: 9, openTime: '07:00', isOpen: true })
    expect(fetchMenu).toHaveBeenCalled()
  })

  it('lỗi từ máy chủ thành thông báo tiếng Việt', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_restaurant' } })
    const owner = useMyRestaurantStore()
    expect(await owner.save(form)).toEqual({
      ok: false,
      message: 'Thông tin quán chưa hợp lệ. Vui lòng kiểm tra lại.',
    })
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await owner.load()
    expect(owner.status).toBe('error')
    expect(owner.error).toContain('Không kết nối được')
  })
})

describe('Tạm đóng', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('quán Tạm đóng ẩn khỏi danh sách, nổi bật và gợi ý AI nhưng vẫn mở được bằng id', async () => {
    const rows = nestedMenuRows()
    rows.restaurants[0].is_open = false
    const closedId = rows.restaurants[0].id
    fetchMenu.mockResolvedValue(normalizeMenu(rows))
    const menu = useMenuStore()
    await menu.load()

    expect(menu.restaurantById(closedId).isOpen).toBe(false)
    expect(menu.searchRestaurants({}).some((r) => r.id === closedId)).toBe(false)
    expect(menu.featuredRestaurants.some((r) => r.id === closedId)).toBe(false)
    expect(menu.orderableFoods.some((f) => f.restaurantId === closedId)).toBe(false)
    expect(menu.featuredFoods.some((f) => f.restaurantId === closedId)).toBe(false)
    expect(menu.foods.some((f) => f.restaurantId === closedId)).toBe(true)
  })

  it('dữ liệu cũ không có is_open thì coi như đang mở bán', () => {
    const menu = normalizeMenu(nestedMenuRows())
    expect(menu.restaurants.every((r) => r.isOpen)).toBe(true)
  })

  it('đặt đơn ở quán Tạm đóng có thông báo riêng', () => {
    expect(orderErrorMessage('restaurant_closed')).toContain('tạm đóng')
  })
})
