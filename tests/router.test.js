import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'

vi.mock('@/services/menuApi', () => ({
  fetchMenu: vi.fn(async () => normalizeMenu(nestedMenuRows())),
}))

const { routes, pageTitle } = await import('@/router')
const App = (await import('@/App.vue')).default

async function mountAt(path) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return { wrapper, router }
}

describe('router', () => {
  it('hiển thị trang chủ với danh mục, quán và món nổi bật', async () => {
    const { wrapper } = await mountAt('/')
    expect(wrapper.text()).toContain('Đặt món ngay')
    expect(wrapper.text()).toContain('Bún & Phở')
    expect(wrapper.text()).toContain('Quán nổi bật')
    expect(wrapper.text()).toContain('Phở bò tái')
  })

  it('danh mục ở trang chủ dẫn tới danh sách quán đã lọc', async () => {
    const { wrapper } = await mountAt('/')
    const link = wrapper.findAll('a').find((a) => a.text().includes('Tráng miệng'))
    expect(link.attributes('href')).toBe('/restaurants?category=trang-mieng')
  })

  it('hiển thị trang 404 cho đường dẫn không tồn tại', async () => {
    const { wrapper, router } = await mountAt('/khong-co-trang-nay')
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(wrapper.text()).toContain('Không tìm thấy trang')
  })

  it('id quán không phải số thì là 404', async () => {
    const { router } = await mountAt('/restaurants/abc')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('tạo tiêu đề tab từ meta.title', async () => {
    const { router } = await mountAt('/restaurants')
    expect(pageTitle(router.currentRoute.value)).toBe('Quán ăn · FoodieGo')
  })
})
