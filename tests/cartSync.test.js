import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { capToStock, mergeCarts } from '@/lib/cart'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'
import { useMenuStore } from '@/stores/menu'
import { useCartStore } from '@/stores/cart'
import {
  createMemoryCartRepository,
  createSupabaseCartRepository,
} from '@/services/cartRepositories'
import { setupCartSync } from '@/services/cartSync'

const menuData = normalizeMenu(nestedMenuRows())
const foods = menuData.restaurants.flatMap((r) => r.foods)
const food = (name) => foods.find((f) => f.name === name)

const pho = food('Phở bò tái') // quán 1, stock 30
const bunBo = food('Bún bò Huế') // quán 1, stock 3
const comTam = food('Cơm tấm sườn bì chả') // quán 2

const item = (f, quantity, extra = {}) => ({
  foodId: f.id,
  sizeId: f.sizes[0]?.id ?? null,
  toppingIds: [],
  spiceLevel: 0,
  quantity,
  ...extra,
})
const cartOf = (restaurantId, ...items) => ({ restaurantId, items })
const stockOf = (foodId) => foods.find((f) => f.id === foodId)?.stock ?? 0

describe('mergeCarts', () => {
  it('một bên trống thì lấy bên còn lại', () => {
    const remote = cartOf(1, item(pho, 2))
    expect(mergeCarts(null, remote, stockOf)).toEqual({ status: 'merged', state: remote })
    expect(mergeCarts(remote, { restaurantId: null, items: [] }, stockOf).state).toEqual(remote)
  })

  it('cùng quán: dòng trùng cộng dồn, dòng khác giữ riêng', () => {
    const remote = cartOf(1, item(pho, 2))
    const local = cartOf(1, item(pho, 1), item(pho, 1, { spiceLevel: 3 }))
    const { status, state } = mergeCarts(local, remote, stockOf)
    expect(status).toBe('merged')
    expect(state.items.map((i) => [i.spiceLevel, i.quantity])).toEqual([
      [0, 3],
      [3, 1],
    ])
  })

  it('topping khác thứ tự vẫn là cùng một dòng khi gộp', () => {
    const [a, b] = pho.toppings
    const remote = cartOf(1, item(pho, 1, { toppingIds: [a.id, b.id] }))
    const local = cartOf(1, item(pho, 1, { toppingIds: [b.id, a.id] }))
    expect(mergeCarts(local, remote, stockOf).state.items).toHaveLength(1)
  })

  it('cắt tại tồn kho, ưu tiên phần đã có trong tài khoản', () => {
    const remote = cartOf(1, item(bunBo, 2))
    const local = cartOf(1, item(bunBo, 2, { sizeId: bunBo.sizes[1].id }))
    const { state } = mergeCarts(local, remote, stockOf)
    expect(state.items.map((i) => [i.sizeId, i.quantity])).toEqual([
      [bunBo.sizes[0].id, 2],
      [bunBo.sizes[1].id, 1],
    ])
  })

  it('khác quán thì báo xung đột, không tự gộp', () => {
    const local = cartOf(1, item(pho, 1))
    const remote = cartOf(2, item(comTam, 1))
    expect(mergeCarts(local, remote, stockOf)).toEqual({ status: 'conflict', local, remote })
  })

  it('capToStock bỏ dòng về 0 và trả giỏ trống nếu hết', () => {
    expect(capToStock(cartOf(1, item(pho, 2)), () => 0)).toEqual({ restaurantId: null, items: [] })
  })
})

describe('cart store khi đăng nhập/đăng xuất', () => {
  let cart
  let guest

  beforeEach(async () => {
    setActivePinia(createPinia())
    const menu = useMenuStore()
    menu.categories = menuData.categories
    menu.restaurants = menuData.restaurants
    menu.status = 'ready'
    guest = createMemoryCartRepository()
    cart = useCartStore()
    await cart.useRepository(guest)
  })

  it('gộp giỏ trên máy vào tài khoản và lưu lên tài khoản', async () => {
    const account = createMemoryCartRepository(cartOf(1, item(pho, 2)))
    cart.addItem({ foodId: pho.id, quantity: 1 })
    cart.addItem({ foodId: bunBo.id, quantity: 1 })

    expect(await cart.mergeOnLogin(account)).toBe('merged')
    expect(cart.itemCount).toBe(4)
    expect(account.peek().items.map((i) => [i.foodId, i.quantity])).toEqual([
      [pho.id, 3],
      [bunBo.id, 1],
    ])

    // Từ giờ mọi thay đổi lưu vào tài khoản
    cart.updateQuantity(cart.lines[0].key, 5)
    expect(account.peek().items[0].quantity).toBe(5)
  })

  it('giỏ trên máy trống thì chỉ nạp giỏ tài khoản, không ghi lại', async () => {
    const account = createMemoryCartRepository(cartOf(1, item(pho, 2)))
    await cart.mergeOnLogin(account)
    expect(cart.itemCount).toBe(2)
    expect(account.saves).toBe(0)
  })

  it('khác quán: hiện giỏ tài khoản, chờ khách chọn giữ giỏ trên máy', async () => {
    const account = createMemoryCartRepository(cartOf(2, item(comTam, 1)))
    cart.addItem({ foodId: pho.id, quantity: 2 })

    expect(await cart.mergeOnLogin(account)).toBe('conflict')
    expect(cart.pendingConflict).not.toBeNull()
    expect(cart.restaurantId).toBe(comTam.restaurantId)
    expect(account.saves).toBe(0)

    cart.resolveConflict('local')
    expect(cart.pendingConflict).toBeNull()
    expect(cart.restaurantId).toBe(pho.restaurantId)
    expect(account.peek()).toEqual(cartOf(pho.restaurantId, item(pho, 2)))
  })

  it('khác quán: chọn giữ giỏ tài khoản thì không ghi gì', async () => {
    const account = createMemoryCartRepository(cartOf(2, item(comTam, 1)))
    cart.addItem({ foodId: pho.id })
    await cart.mergeOnLogin(account)
    cart.resolveConflict('remote')
    expect(cart.restaurantId).toBe(comTam.restaurantId)
    expect(account.saves).toBe(0)
  })

  it('thực đơn chưa tải được thì không xóa nhầm giỏ khi gộp', async () => {
    useMenuStore().status = 'error'
    const account = createMemoryCartRepository()
    cart.addItem({ foodId: pho.id, quantity: 2 })
    useMenuStore().load = vi.fn().mockResolvedValue()
    await cart.mergeOnLogin(account)
    expect(account.peek().items[0].quantity).toBe(2)
  })

  it('đăng xuất: giỏ hiển thị trống, giỏ tài khoản giữ nguyên', async () => {
    const account = createMemoryCartRepository(cartOf(1, item(pho, 2)))
    await cart.mergeOnLogin(account)
    await cart.switchToGuest(guest)
    expect(cart.isEmpty).toBe(true)
    expect(account.peek().items).toHaveLength(1)

    cart.addItem({ foodId: comTam.id })
    expect(guest.peek().items[0].foodId).toBe(comTam.id)
    expect(account.peek().items[0].foodId).toBe(pho.id)
  })
})

describe('setupCartSync', () => {
  function fakeAuth(user = null) {
    const handlers = { in: [], out: [] }
    return {
      user,
      init: vi.fn(async () => {}),
      onSignedIn: (cb) => handlers.in.push(cb),
      onSignedOut: (cb) => handlers.out.push(cb),
      signIn: async (u) => {
        for (const cb of handlers.in) await cb(u)
      },
      signOut: async () => {
        for (const cb of handlers.out) await cb()
      },
    }
  }

  function fakeCart() {
    return {
      useRepository: vi.fn(async () => {}),
      mergeOnLogin: vi.fn(async () => 'merged'),
      switchToGuest: vi.fn(async () => {}),
    }
  }

  it('khách vãng lai: dùng giỏ trên máy', async () => {
    const auth = fakeAuth()
    const cart = fakeCart()
    const guest = createMemoryCartRepository()
    await setupCartSync({ auth, cart, guestRepo: guest, accountRepoFor: vi.fn() })
    expect(cart.useRepository).toHaveBeenCalledWith(guest)
    expect(cart.mergeOnLogin).not.toHaveBeenCalled()
  })

  it('đã đăng nhập sẵn: chuyển sang giỏ tài khoản và xóa giỏ trên máy', async () => {
    const auth = fakeAuth({ id: 'u1' })
    const cart = fakeCart()
    const guest = createMemoryCartRepository(cartOf(1, item(pho, 1)))
    const accountRepo = createMemoryCartRepository()
    const accountRepoFor = vi.fn(() => accountRepo)
    await setupCartSync({ auth, cart, guestRepo: guest, accountRepoFor })
    expect(accountRepoFor).toHaveBeenCalledWith({ id: 'u1' })
    expect(cart.mergeOnLogin).toHaveBeenCalledWith(accountRepo)
    expect(guest.peek().items).toEqual([])
  })

  it('đăng nhập rồi đăng xuất', async () => {
    const auth = fakeAuth()
    const cart = fakeCart()
    const guest = createMemoryCartRepository(cartOf(1, item(pho, 1)))
    const accountRepo = createMemoryCartRepository()
    await setupCartSync({ auth, cart, guestRepo: guest, accountRepoFor: () => accountRepo })

    await auth.signIn({ id: 'u1' })
    expect(cart.mergeOnLogin).toHaveBeenCalledWith(accountRepo)
    expect(guest.peek().items).toEqual([])

    await auth.signOut()
    expect(cart.switchToGuest).toHaveBeenCalledWith(guest)
  })
})

describe('Supabase cart repository', () => {
  function fakeClient({ rows = [], rpcDelay = 0 } = {}) {
    const calls = []
    return {
      calls,
      rpc: vi.fn(async (name, args) => {
        calls.push(args.items.map((i) => i.quantity))
        await new Promise((r) => setTimeout(r, rpcDelay))
        return { error: null }
      }),
      from: () => ({
        select: () => ({ order: async () => ({ data: rows, error: null }) }),
      }),
    }
  }

  it('đọc cart_items thành trạng thái giỏ', async () => {
    const client = fakeClient({
      rows: [
        {
          food_id: 1,
          size_id: 2,
          topping_ids: [1, 3],
          spice_level: 2,
          quantity: 4,
          foods: { restaurant_id: 1 },
        },
        {
          food_id: 9,
          size_id: null,
          topping_ids: [],
          spice_level: 0,
          quantity: 1,
          foods: { restaurant_id: 2 },
        },
      ],
    })
    expect(await createSupabaseCartRepository(client).load()).toEqual({
      restaurantId: 1,
      items: [{ foodId: 1, sizeId: 2, toppingIds: [1, 3], spiceLevel: 2, quantity: 4 }],
    })
  })

  it('lưu liên tiếp: một request mỗi lúc, chỉ gửi trạng thái mới nhất', async () => {
    const client = fakeClient({ rpcDelay: 5 })
    const repo = createSupabaseCartRepository(client)
    const state = (q) => cartOf(1, item(pho, q))
    const first = repo.save(state(1))
    repo.save(state(2))
    repo.save(state(3))
    await first
    expect(client.calls).toEqual([[1], [3]])
    await repo.save(state(4))
    expect(client.calls).toEqual([[1], [3], [4]])
  })

  it('báo lỗi khi RPC lỗi', async () => {
    const client = fakeClient()
    client.rpc.mockResolvedValueOnce({ error: new Error('mất mạng') })
    await expect(
      createSupabaseCartRepository(client).save(cartOf(1, item(pho, 1))),
    ).rejects.toThrow('mất mạng')
  })
})
