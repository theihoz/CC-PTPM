import { describe, expect, it } from 'vitest'
import {
  filterRestaurants,
  isOpenAt,
  matchingFoodNames,
  normalizeMenu,
  normalizeSort,
  stockStatus,
} from '@/lib/menu'
import { normalizeText } from '@/lib/text'
import { nestedMenuRows } from '@/data/menuSeed'

const menu = normalizeMenu(nestedMenuRows())
const search = (params) =>
  filterRestaurants(menu.restaurants, menu.categories, params).map((r) => r.slug)

// 12:00 UTC = 19:00 giờ Việt Nam
const at = (hhmm) => new Date(`2026-11-04T${hhmm}:00+07:00`)

describe('normalizeText', () => {
  it('bỏ dấu, đ → d, chữ thường, gộp khoảng trắng', () => {
    expect(normalizeText('  Phở  Bò ĐẶC biệt ')).toBe('pho bo dac biet')
  })
})

describe('normalizeMenu', () => {
  it('chuyển dữ liệu database thành đối tượng miền có size và topping', () => {
    const pho = menu.restaurants.find((r) => r.slug === 'pho-ha-thanh')
    expect(pho.openTime).toBe('06:00')
    const phoBo = pho.foods.find((f) => f.name === 'Phở bò tái')
    expect(phoBo).toMatchObject({ basePrice: 55_000, hasSpice: true, restaurantId: pho.id })
    expect(phoBo.sizes.map((s) => s.name)).toEqual(['Thường', 'Lớn'])
    expect(phoBo.sizes[0].isDefault).toBe(true)
    expect(phoBo.toppings).toHaveLength(3)
  })

  it('bỏ món đã ngừng bán', () => {
    const rows = nestedMenuRows()
    rows.restaurants[0].foods[0].is_available = false
    const first = normalizeMenu(rows).restaurants[0]
    expect(first.foods).toHaveLength(rows.restaurants[0].foods.length - 1)
  })
})

describe('filterRestaurants', () => {
  it('không có bộ lọc thì trả về mọi quán, sắp xếp theo đánh giá', () => {
    const result = filterRestaurants(menu.restaurants, menu.categories, {})
    expect(result).toHaveLength(menu.restaurants.length)
    expect(result[0].slug).toBe('sweet-corner')
  })

  it('tìm theo tên quán, không phân biệt dấu và hoa thường', () => {
    expect(search({ q: 'pho ha' })).toEqual(['pho-ha-thanh'])
    expect(search({ q: 'PHỞ HÀ' })).toEqual(['pho-ha-thanh'])
  })

  it('tìm theo tên món', () => {
    expect(search({ q: 'trà sữa' })).toEqual(['tra-sua-may'])
    expect(search({ q: 'burger' })).toContain('burger-house')
  })

  it('lọc theo danh mục chính hoặc theo món thuộc danh mục', () => {
    const drinks = search({ category: 'do-uong' })
    expect(drinks).toContain('tra-sua-may')
    // Green Bowl có nước cam ép thuộc danh mục đồ uống
    expect(drinks).toContain('green-bowl')
    expect(drinks).not.toContain('burger-house')
  })

  it('kết hợp từ khóa và danh mục', () => {
    expect(search({ q: 'nước cam', category: 'do-uong' })).toEqual(['green-bowl'])
  })

  it('danh mục không tồn tại thì không có kết quả', () => {
    expect(search({ category: 'khong-co' })).toEqual([])
  })

  it('sắp xếp theo giao nhanh và theo tên', () => {
    expect(search({ sort: 'delivery' })[0]).toBe('tra-sua-may')
    const byName = filterRestaurants(menu.restaurants, menu.categories, { sort: 'name' })
    const names = byName.map((r) => r.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'vi')))
  })

  it('giá trị sort lạ rơi về mặc định', () => {
    expect(normalizeSort('hack')).toBe('rating')
    expect(normalizeSort('name')).toBe('name')
  })

  it('liệt kê tên món khớp từ khóa', () => {
    const tra = menu.restaurants.find((r) => r.slug === 'tra-sua-may')
    expect(matchingFoodNames(tra, 'tra')).toEqual(['Trà sữa trân châu đường đen', 'Trà đào cam sả'])
    expect(matchingFoodNames(tra, '')).toEqual([])
  })
})

describe('isOpenAt', () => {
  const r = (openTime, closeTime) => ({ openTime, closeTime })

  it('mở trong khung giờ, đóng ngoài khung giờ (giờ Việt Nam)', () => {
    expect(isOpenAt(r('06:00', '22:00'), at('06:00'))).toBe(true)
    expect(isOpenAt(r('06:00', '22:00'), at('21:59'))).toBe(true)
    expect(isOpenAt(r('06:00', '22:00'), at('22:00'))).toBe(false)
    expect(isOpenAt(r('06:00', '22:00'), at('05:59'))).toBe(false)
  })

  it('hỗ trợ quán mở qua nửa đêm', () => {
    const late = r('10:30', '00:30')
    expect(isOpenAt(late, at('23:45'))).toBe(true)
    expect(isOpenAt(late, at('00:15'))).toBe(true)
    expect(isOpenAt(late, at('00:30'))).toBe(false)
    expect(isOpenAt(late, at('09:00'))).toBe(false)
  })
})

describe('stockStatus', () => {
  it('phân loại hết, sắp hết, còn hàng', () => {
    expect(stockStatus(0)).toBe('out')
    expect(stockStatus(1)).toBe('low')
    expect(stockStatus(5)).toBe('low')
    expect(stockStatus(6)).toBe('ok')
  })
})

describe('dữ liệu mẫu', () => {
  it('đủ quy mô và có món để demo tồn kho', () => {
    expect(menu.restaurants.length).toBeGreaterThanOrEqual(6)
    const foods = menu.restaurants.flatMap((r) => r.foods)
    expect(foods.length).toBeGreaterThanOrEqual(40)
    expect(foods.some((f) => f.stock === 0)).toBe(true)
    expect(foods.some((f) => stockStatus(f.stock) === 'low')).toBe(true)
    expect(foods.some((f) => f.hasSpice)).toBe(true)
  })

  it('mỗi món có size thì có đúng một size mặc định', () => {
    for (const food of menu.restaurants.flatMap((r) => r.foods)) {
      if (food.sizes.length === 0) continue
      expect(
        food.sizes.filter((s) => s.isDefault),
        food.name,
      ).toHaveLength(1)
    }
  })
})
