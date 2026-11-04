import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeMenu } from '@/lib/menu'
import { summarize } from '@/lib/cart'
import { nestedMenuRows } from '@/data/menuSeed'
import { useMenuStore } from '@/stores/menu'
import { useCartStore } from '@/stores/cart'
import {
  CART_STORAGE_KEY,
  createLocalStorageCartRepository,
  createMemoryCartRepository,
} from '@/services/cartRepositories'

const menuData = normalizeMenu(nestedMenuRows())
const allFoods = menuData.restaurants.flatMap((r) => r.foods)
const food = (name) => allFoods.find((f) => f.name === name)

const pho = food('Phở bò tái') // quán 1 · 55.000 · Lớn +15.000 · stock 30 · có cay
const bunBo = food('Bún bò Huế') // quán 1 · 60.000 · stock 3
const phoGa = food('Phở gà') // quán 1 · 50.000 · stock 25
const goiCuon = food('Gỏi cuốn tôm thịt (2 cuốn)') // quán 1 · 35.000
const miXao = food('Mì xào giòn hải sản') // quán 1 · stock 0
const comTam = food('Cơm tấm sườn bì chả') // quán 2

const [phoThuong, phoLon] = pho.sizes
const [boTai, trungChan, quay] = pho.toppings

let repo
let cart

async function freshCart(initial = null) {
  setActivePinia(createPinia())
  const menu = useMenuStore()
  menu.categories = menuData.categories
  menu.restaurants = menuData.restaurants
  menu.status = 'ready'
  repo = createMemoryCartRepository(initial)
  cart = useCartStore()
  await cart.useRepository(repo)
  return cart
}

beforeEach(() => freshCart())

describe('tách và gộp dòng', () => {
  it('cùng món khác size, topping hoặc độ cay là các dòng riêng', () => {
    cart.addItem({ foodId: pho.id, sizeId: phoThuong.id })
    cart.addItem({ foodId: pho.id, sizeId: phoLon.id })
    cart.addItem({ foodId: pho.id, sizeId: phoThuong.id, toppingIds: [boTai.id] })
    cart.addItem({ foodId: pho.id, sizeId: phoThuong.id, spiceLevel: 3 })
    expect(cart.lines).toHaveLength(4)
    expect(cart.itemCount).toBe(4)
  })

  it('giống hệt thì cộng dồn vào dòng cũ', () => {
    expect(cart.addItem({ foodId: pho.id, quantity: 2 }).status).toBe('added')
    expect(cart.addItem({ foodId: pho.id, quantity: 1 }).status).toBe('merged')
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].quantity).toBe(3)
  })

  it('thứ tự chọn topping khác nhau vẫn là cùng một dòng', () => {
    cart.addItem({ foodId: pho.id, toppingIds: [quay.id, boTai.id] })
    cart.addItem({ foodId: pho.id, toppingIds: [boTai.id, quay.id] })
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].quantity).toBe(2)
  })

  it('không chọn size thì dùng size mặc định và gộp với dòng chọn size mặc định', () => {
    cart.addItem({ foodId: pho.id })
    cart.addItem({ foodId: pho.id, sizeId: phoThuong.id })
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].size.id).toBe(phoThuong.id)
  })

  it('độ cay của món không cay luôn về 0', () => {
    cart.addItem({ foodId: goiCuon.id, spiceLevel: 4 })
    cart.addItem({ foodId: goiCuon.id, spiceLevel: 0 })
    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].spiceLevel).toBe(0)
  })

  it('từ chối size không thuộc món, món không tồn tại và số lượng không hợp lệ', () => {
    expect(cart.addItem({ foodId: pho.id, sizeId: 99999 }).status).toBe('invalid')
    expect(cart.addItem({ foodId: 99999 }).status).toBe('invalid')
    expect(cart.addItem({ foodId: pho.id, quantity: 0 }).status).toBe('invalid')
    expect(cart.isEmpty).toBe(true)
  })
})

describe('tính giá', () => {
  it('đơn giá và thành tiền theo size, topping và số lượng', () => {
    cart.addItem({
      foodId: pho.id,
      sizeId: phoLon.id,
      toppingIds: [boTai.id, trungChan.id],
      quantity: 2,
    })
    const [line] = cart.lines
    expect(line.unitPrice).toBe(55_000 + 15_000 + 15_000 + 7_000)
    expect(line.lineTotal).toBe(92_000 * 2)
    expect(cart.subtotal).toBe(184_000)
  })

  it('đổi số lượng thì thành tiền và tổng tự tính lại', () => {
    const { key } = cart.addItem({ foodId: phoGa.id })
    expect(cart.subtotal).toBe(50_000)
    cart.updateQuantity(key, 3)
    expect(cart.lines[0].lineTotal).toBe(150_000)
    expect(cart.total).toBe(150_000 + 15_000)
  })
})

describe('tồn kho', () => {
  it('remainingStock trừ mọi dòng cùng món, kể cả khác size', () => {
    cart.addItem({ foodId: bunBo.id, sizeId: bunBo.sizes[0].id })
    cart.addItem({ foodId: bunBo.id, sizeId: bunBo.sizes[1].id })
    expect(cart.remainingStock(bunBo.id)).toBe(1)
  })

  it('chặn thêm vượt kho và báo số còn lại', () => {
    cart.addItem({ foodId: bunBo.id, quantity: 2 })
    const result = cart.addItem({ foodId: bunBo.id, quantity: 2 })
    expect(result).toEqual({ status: 'stock', remaining: 1 })
    expect(cart.itemCount).toBe(2)
  })

  it('món hết hàng không thêm được', () => {
    expect(cart.addItem({ foodId: miXao.id }).status).toBe('stock')
  })

  it('tăng vượt kho thì giữ ở mức tối đa', () => {
    cart.addItem({ foodId: bunBo.id, sizeId: bunBo.sizes[1].id })
    const { key } = cart.addItem({ foodId: bunBo.id, sizeId: bunBo.sizes[0].id })
    expect(cart.updateQuantity(key, 10)).toEqual({ status: 'stock', remaining: 0, quantity: 2 })
    expect(cart.remainingStock(bunBo.id)).toBe(0)
  })

  it('giảm hoặc xóa thì remainingStock tăng lại', () => {
    const { key } = cart.addItem({ foodId: bunBo.id, quantity: 3 })
    expect(cart.remainingStock(bunBo.id)).toBe(0)
    cart.updateQuantity(key, 1)
    expect(cart.remainingStock(bunBo.id)).toBe(2)
    cart.removeItem(key)
    expect(cart.remainingStock(bunBo.id)).toBe(3)
  })

  it('đặt số lượng 0 thì xóa dòng', () => {
    const { key } = cart.addItem({ foodId: pho.id })
    expect(cart.updateQuantity(key, 0).status).toBe('removed')
    expect(cart.isEmpty).toBe(true)
    expect(cart.restaurantId).toBeNull()
  })
})

describe('phí ship và đơn tối thiểu', () => {
  it('ngưỡng miễn phí ship 199.999 / 200.000', () => {
    expect(summarize(199_999).shippingFee).toBe(15_000)
    expect(summarize(200_000).shippingFee).toBe(0)
  })

  it('ngưỡng đơn tối thiểu 50.000', () => {
    expect(summarize(49_999)).toMatchObject({ meetsMinimum: false, amountToMinimum: 1 })
    expect(summarize(50_000)).toMatchObject({ meetsMinimum: true, amountToMinimum: 0 })
  })

  it('giỏ trống không tính phí ship', () => {
    expect(cart.shippingFee).toBe(0)
    expect(cart.total).toBe(0)
  })

  it('trong giỏ: 150.000 tính ship, 200.000 miễn ship', () => {
    const { key } = cart.addItem({ foodId: phoGa.id, quantity: 3 })
    expect(cart.shippingFee).toBe(15_000)
    cart.updateQuantity(key, 4)
    expect(cart.subtotal).toBe(200_000)
    expect(cart.shippingFee).toBe(0)
    expect(cart.total).toBe(200_000)
  })

  it('trong giỏ: dưới tối thiểu thì báo số tiền còn thiếu', () => {
    cart.addItem({ foodId: goiCuon.id })
    expect(cart.meetsMinimum).toBe(false)
    expect(cart.amountToMinimum).toBe(15_000)
  })
})

describe('một giỏ một quán', () => {
  it('thêm món quán khác thì cần xác nhận và không đổi giỏ', () => {
    cart.addItem({ foodId: pho.id })
    const result = cart.addItem({ foodId: comTam.id })
    expect(result).toMatchObject({
      status: 'other-restaurant',
      currentRestaurantId: pho.restaurantId,
      nextRestaurantId: comTam.restaurantId,
    })
    expect(cart.lines.map((l) => l.foodId)).toEqual([pho.id])
    expect(cart.restaurantId).toBe(pho.restaurantId)
  })

  it('xác nhận đổi quán thì giỏ chỉ còn món mới', () => {
    cart.addItem({ foodId: pho.id, quantity: 2 })
    expect(cart.replaceWith({ foodId: comTam.id }).status).toBe('added')
    expect(cart.lines.map((l) => l.foodId)).toEqual([comTam.id])
    expect(cart.restaurantId).toBe(comTam.restaurantId)
  })

  it('đổi quán thất bại thì giữ nguyên giỏ cũ', () => {
    cart.addItem({ foodId: comTam.id })
    expect(cart.replaceWith({ foodId: miXao.id }).status).toBe('stock')
    expect(cart.lines.map((l) => l.foodId)).toEqual([comTam.id])
  })

  it('xóa hết giỏ thì thêm được món quán khác', () => {
    cart.addItem({ foodId: pho.id })
    cart.clear()
    expect(cart.addItem({ foodId: comTam.id }).status).toBe('added')
  })
})

describe('lưu và khôi phục', () => {
  it('mỗi thay đổi đều được lưu qua repository', () => {
    const { key } = cart.addItem({ foodId: pho.id, toppingIds: [quay.id] })
    cart.updateQuantity(key, 2)
    expect(repo.peek()).toEqual({
      restaurantId: pho.restaurantId,
      items: [
        {
          foodId: pho.id,
          sizeId: phoThuong.id,
          toppingIds: [quay.id],
          spiceLevel: 0,
          quantity: 2,
        },
      ],
    })
  })

  it('khôi phục giỏ đã lưu khi khởi tạo lại', async () => {
    cart.addItem({ foodId: pho.id, sizeId: phoLon.id, quantity: 2 })
    const saved = repo.peek()
    await freshCart(saved)
    expect(cart.itemCount).toBe(2)
    expect(cart.lines[0].size.id).toBe(phoLon.id)
    expect(cart.subtotal).toBe(140_000)
  })

  it('LocalStorage repository lưu, đọc lại và bỏ dữ liệu hỏng', () => {
    const data = new Map()
    const storage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    }
    const local = createLocalStorageCartRepository(storage)
    const state = {
      restaurantId: 1,
      items: [{ foodId: 1, sizeId: 1, toppingIds: [2], spiceLevel: 0, quantity: 2 }],
    }
    local.save(state)
    expect(local.load()).toEqual(state)

    data.set(
      CART_STORAGE_KEY,
      JSON.stringify({ restaurantId: 1, items: [{ foodId: 'x', quantity: -1 }, state.items[0]] }),
    )
    expect(local.load().items).toEqual(state.items)

    data.set(CART_STORAGE_KEY, '{không phải json')
    expect(local.load()).toBeNull()

    local.save({ restaurantId: null, items: [] })
    expect(data.has(CART_STORAGE_KEY)).toBe(false)
  })
})
