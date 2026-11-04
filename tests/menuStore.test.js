import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'

vi.mock('@/services/menuApi', () => ({ fetchMenu: vi.fn() }))

const { fetchMenu } = await import('@/services/menuApi')
const { useMenuStore } = await import('@/stores/menu')

const menuData = normalizeMenu(nestedMenuRows())

describe('menu store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMenu.mockReset()
  })

  it('tải thực đơn và cung cấp quán, món nổi bật', async () => {
    fetchMenu.mockResolvedValue(menuData)
    const menu = useMenuStore()
    expect(menu.status).toBe('idle')

    const loading = menu.load()
    expect(menu.status).toBe('loading')
    await loading

    expect(menu.status).toBe('ready')
    expect(menu.featuredRestaurants.every((r) => r.isFeatured)).toBe(true)
    expect(menu.featuredFoods.length).toBeGreaterThan(0)
    expect(menu.restaurantById(1).slug).toBe('pho-ha-thanh')
    expect(menu.restaurantById('1').slug).toBe('pho-ha-thanh')
    expect(menu.foodById(1).name).toBe('Phở bò tái')
    expect(menu.categoryById(1).slug).toBe('bun-pho')
  })

  it('chỉ gọi API một lần dù load nhiều lần', async () => {
    fetchMenu.mockResolvedValue(menuData)
    const menu = useMenuStore()
    await Promise.all([menu.load(), menu.load()])
    await menu.load()
    expect(fetchMenu).toHaveBeenCalledTimes(1)
  })

  it('báo lỗi rồi thử lại thành công', async () => {
    fetchMenu.mockRejectedValueOnce(new Error('mất mạng')).mockResolvedValueOnce(menuData)
    const menu = useMenuStore()

    await menu.load()
    expect(menu.status).toBe('error')
    expect(menu.error.message).toBe('mất mạng')

    await menu.load({ force: true })
    expect(menu.status).toBe('ready')
    expect(menu.error).toBeNull()
  })

  it('tìm kiếm qua store', async () => {
    fetchMenu.mockResolvedValue(menuData)
    const menu = useMenuStore()
    await menu.load()
    expect(menu.searchRestaurants({ q: 'pizza' }).map((r) => r.slug)).toEqual(['pizza-bon-mua'])
  })
})
