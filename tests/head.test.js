import { describe, expect, it } from 'vitest'
import { DEFAULT_DESCRIPTION, setPageHead } from '@/lib/head'
import { routes } from '@/router'

const description = () =>
  document.querySelector('meta[name="description"]')?.getAttribute('content')

describe('setPageHead', () => {
  it('đặt tiêu đề tab và meta description', () => {
    setPageHead({ title: 'Giỏ hàng', description: 'Mô tả giỏ' })
    expect(document.title).toBe('Giỏ hàng · FoodieGo')
    expect(description()).toBe('Mô tả giỏ')
  })

  it('không có mô tả thì dùng mô tả mặc định, chỉ một thẻ meta', () => {
    setPageHead({ title: 'X' })
    setPageHead({})
    expect(document.title).toBe('FoodieGo')
    expect(description()).toBe(DEFAULT_DESCRIPTION)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })
})

describe('meta của route', () => {
  it('mọi route đều có tiêu đề và mô tả', () => {
    for (const route of routes) {
      expect(route.meta?.title, route.path).toBeTruthy()
      expect(route.meta?.description, route.path).toBeTruthy()
    }
  })
})
