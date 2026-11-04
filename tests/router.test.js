import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { mount, flushPromises } from '@vue/test-utils'
import { routes, pageTitle } from '@/router'
import App from '@/App.vue'

async function mountAt(path) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('router', () => {
  it('hiển thị trang chủ ở /', async () => {
    const { wrapper } = await mountAt('/')
    expect(wrapper.text()).toContain('Đặt món ngay')
  })

  it('hiển thị trang 404 cho đường dẫn không tồn tại', async () => {
    const { wrapper, router } = await mountAt('/khong-co-trang-nay')
    expect(router.currentRoute.value.name).toBe('not-found')
    expect(wrapper.text()).toContain('Không tìm thấy trang')
    expect(wrapper.find('a[href="/"]').exists()).toBe(true)
  })

  it('tạo tiêu đề tab từ meta.title', async () => {
    const { router } = await mountAt('/khong-co-trang-nay')
    expect(pageTitle(router.currentRoute.value)).toBe('Không tìm thấy trang · FoodieGo')
  })
})
