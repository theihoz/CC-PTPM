import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'

vi.mock('@/services/menuApi', () => ({ fetchMenu: vi.fn() }))

const { fetchMenu } = await import('@/services/menuApi')
const { routes } = await import('@/router')
const RestaurantsView = (await import('@/views/RestaurantsView.vue')).default

async function mountAt(path) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  const wrapper = mount(RestaurantsView, { global: { plugins: [router, pinia] } })
  await flushPromises()
  return { wrapper, router }
}

const cardTitles = (wrapper) => wrapper.findAll('article h3').map((h) => h.text())

describe('trang danh sách quán', () => {
  beforeEach(() => {
    vi.useRealTimers()
    fetchMenu.mockReset()
    fetchMenu.mockResolvedValue(normalizeMenu(nestedMenuRows()))
  })

  it('đọc bộ lọc từ URL', async () => {
    const { wrapper } = await mountAt('/restaurants?category=trang-mieng&q=sundae')
    expect(wrapper.find('h1').text()).toBe('Quán Tráng miệng')
    expect(wrapper.get('#restaurant-search').element.value).toBe('sundae')
    expect(cardTitles(wrapper)).toEqual(['Sweet Corner'])
    expect(wrapper.find('[aria-current="page"]').text()).toContain('Tráng miệng')
  })

  it('gõ từ khóa thì lọc và ghi vào URL', async () => {
    vi.useFakeTimers()
    const { wrapper, router } = await mountAt('/restaurants')
    await wrapper.get('#restaurant-search').setValue('pizza')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('pizza')
    expect(cardTitles(wrapper)).toEqual(['Pizza Bốn Mùa'])
  })

  it('hiện trạng thái rỗng và xóa được bộ lọc', async () => {
    const { wrapper, router } = await mountAt('/restaurants?q=khongcomon')
    expect(wrapper.text()).toContain('Không tìm thấy quán phù hợp')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    expect(cardTitles(wrapper).length).toBeGreaterThan(1)
  })

  it('hiện lỗi và nút thử lại khi không tải được', async () => {
    fetchMenu.mockReset()
    fetchMenu.mockRejectedValueOnce(Object.assign(new Error('Không tải được thực đơn.'), {}))
    fetchMenu.mockResolvedValueOnce(normalizeMenu(nestedMenuRows()))
    const { wrapper } = await mountAt('/restaurants')
    expect(wrapper.get('[role="alert"]').text()).toContain('Không tải được thực đơn.')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(cardTitles(wrapper).length).toBe(7)
  })
})
