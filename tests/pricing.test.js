import { describe, expect, it } from 'vitest'
import {
  clampQuantity,
  defaultSelection,
  lineTotal,
  normalizeSpice,
  normalizeToppingIds,
  unitPrice,
} from '@/lib/pricing'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'

const foods = normalizeMenu(nestedMenuRows()).restaurants.flatMap((r) => r.foods)
const byName = (name) => foods.find((f) => f.name === name)

const pho = byName('Phở bò tái') // 55.000, Lớn +15.000, topping 15.000 / 7.000 / 5.000
const [phoThuong, phoLon] = pho.sizes
const [boTai, trungChan, quay] = pho.toppings
const canhChua = byName('Canh chua cá lóc') // không size, không topping, không cay

describe('defaultSelection', () => {
  it('chọn size mặc định, không topping, không cay, 1 phần', () => {
    expect(defaultSelection(pho)).toEqual({
      sizeId: phoThuong.id,
      toppingIds: [],
      spiceLevel: 0,
      quantity: 1,
    })
  })

  it('món không có size thì sizeId là null', () => {
    expect(defaultSelection(canhChua).sizeId).toBeNull()
  })
})

describe('unitPrice và lineTotal', () => {
  it('giá gốc khi chọn size mặc định', () => {
    expect(unitPrice(pho, defaultSelection(pho))).toBe(55_000)
  })

  it('cộng phụ thu size và tổng topping', () => {
    const selection = { sizeId: phoLon.id, toppingIds: [boTai.id, quay.id] }
    expect(unitPrice(pho, selection)).toBe(55_000 + 15_000 + 15_000 + 5_000)
  })

  it('độ cay không làm đổi giá', () => {
    const base = { sizeId: phoThuong.id, toppingIds: [trungChan.id] }
    expect(unitPrice(pho, { ...base, spiceLevel: 4 })).toBe(unitPrice(pho, base))
  })

  it('nhân số lượng', () => {
    const selection = { sizeId: phoLon.id, toppingIds: [trungChan.id], quantity: 3 }
    expect(lineTotal(pho, selection)).toBe((55_000 + 15_000 + 7_000) * 3)
  })

  it('bỏ qua size, topping không thuộc món và topping trùng', () => {
    const selection = { sizeId: 99999, toppingIds: [trungChan.id, trungChan.id, 99999] }
    expect(unitPrice(pho, selection)).toBe(55_000 + 7_000)
  })

  it('món không size, không topping chỉ có giá gốc', () => {
    expect(lineTotal(canhChua, { ...defaultSelection(canhChua), quantity: 2 })).toBe(90_000)
  })
})

describe('normalizeToppingIds', () => {
  it('sắp xếp tăng dần để thứ tự chọn không ảnh hưởng', () => {
    expect(normalizeToppingIds(pho, [quay.id, boTai.id])).toEqual(
      [boTai.id, quay.id].sort((a, b) => a - b),
    )
  })
})

describe('clampQuantity', () => {
  it('giữ trong khoảng 1..max', () => {
    expect(clampQuantity(0, 5)).toBe(1)
    expect(clampQuantity(-3, 5)).toBe(1)
    expect(clampQuantity(3, 5)).toBe(3)
    expect(clampQuantity(9, 5)).toBe(5)
    expect(clampQuantity('abc', 5)).toBe(1)
  })

  it('hết hàng thì là 0', () => {
    expect(clampQuantity(1, 0)).toBe(0)
  })
})

describe('normalizeSpice', () => {
  it('món không cay luôn là 0', () => {
    expect(normalizeSpice(canhChua, 3)).toBe(0)
  })

  it('món cay chỉ nhận 0–4', () => {
    expect(normalizeSpice(pho, 4)).toBe(4)
    expect(normalizeSpice(pho, 7)).toBe(0)
  })
})
