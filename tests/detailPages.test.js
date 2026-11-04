import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'

vi.mock('@/services/menuApi', () => ({
  fetchMenu: vi.fn(async () => normalizeMenu(nestedMenuRows())),
}))

const { routes } = await import('@/router')
const App = (await import('@/App.vue')).default

const normalize = (s) => s.replace(/\s/g, ' ')

async function mountAt(path) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return { wrapper, router }
}

describe('trang chi tiết quán', () => {
  it('hiển thị thông tin và thực đơn chia nhóm', async () => {
    const { wrapper } = await mountAt('/restaurants/1')
    const text = wrapper.text()
    expect(wrapper.find('h1').text()).toBe('Phở Hà Thành')
    expect(text).toContain('25 Lý Thường Kiệt')
    expect(text).toContain('06:00 – 22:00')
    expect(text).toContain('4.8')
    const groups = wrapper.findAll('section h2').map((h) => h.text())
    expect(groups.some((g) => g.includes('Bún & Phở'))).toBe(true)
    expect(groups.some((g) => g.includes('Healthy & Chay'))).toBe(true)
    expect(text).toContain('Phở bò tái')
  })

  it('quán không tồn tại thì báo 404', async () => {
    const { wrapper } = await mountAt('/restaurants/999')
    expect(wrapper.text()).toContain('Không tìm thấy quán')
  })
})

describe('trang chi tiết món', () => {
  it('hiển thị ảnh, mô tả, calo, tag và giá gốc', async () => {
    const { wrapper } = await mountAt('/restaurants/1/foods/1')
    const text = normalize(wrapper.text())
    expect(wrapper.find('h1').text()).toBe('Phở bò tái')
    expect(wrapper.find('img[alt="Phở bò tái"]').exists()).toBe(true)
    expect(text).toContain('450 kcal')
    expect(text).toContain('Giàu đạm')
    expect(text).toContain('55.000 ₫')
  })

  it('giá tạm tính cập nhật theo size, topping và số lượng', async () => {
    const { wrapper } = await mountAt('/restaurants/1/foods/1')
    const total = () => normalize(wrapper.get('output').text())
    expect(total()).toBe('55.000 ₫')

    const radios = wrapper.findAll('input[name="size"]')
    await radios[1].setValue() // Lớn +15.000
    expect(total()).toBe('70.000 ₫')

    const toppings = wrapper.findAll('input[type="checkbox"]')
    await toppings[0].setValue(true) // Thêm bò tái +15.000
    expect(total()).toBe('85.000 ₫')

    await wrapper.get('button[aria-label="Tăng số lượng"]').trigger('click')
    expect(total()).toBe('170.000 ₫')

    await wrapper.findAll('input[name="spice"]')[3].setValue() // độ cay không đổi giá
    expect(total()).toBe('170.000 ₫')
  })

  it('chỉ món có độ cay mới hiện chọn độ cay', async () => {
    const cay = await mountAt('/restaurants/1/foods/1')
    expect(cay.wrapper.findAll('input[name="spice"]')).toHaveLength(5)
    const khongCay = await mountAt('/restaurants/2/foods/10') // Canh chua cá lóc
    expect(khongCay.wrapper.findAll('input[name="spice"]')).toHaveLength(0)
  })

  it('món hết hàng: nhãn Hết món và nút bị vô hiệu', async () => {
    const { wrapper } = await mountAt('/restaurants/1/foods/4') // Mì xào giòn, stock 0
    const button = wrapper.findAll('button').find((b) => b.text() === 'Hết món')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
  })

  it('món sắp hết: nhãn Sắp hết và không tăng quá tồn kho', async () => {
    const { wrapper } = await mountAt('/restaurants/1/foods/2') // Bún bò Huế, stock 3
    expect(wrapper.text()).toContain('Sắp hết · còn 3')
    const plus = wrapper.get('button[aria-label="Tăng số lượng"]')
    await plus.trigger('click')
    await plus.trigger('click')
    expect(wrapper.get('#quantity').element.value).toBe('3')
    expect(plus.attributes('disabled')).toBeDefined()
  })

  it('món không thuộc quán trên URL thì báo 404', async () => {
    const { wrapper } = await mountAt('/restaurants/2/foods/1')
    expect(wrapper.text()).toContain('Không tìm thấy món')
  })

  it('món không tồn tại thì báo 404', async () => {
    const { wrapper } = await mountAt('/restaurants/1/foods/9999')
    expect(wrapper.text()).toContain('Không tìm thấy món')
  })
})
