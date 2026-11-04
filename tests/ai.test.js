import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeMenu } from '@/lib/menu'
import { nestedMenuRows } from '@/data/menuSeed'
import { MAX_SUGGESTIONS, mockSuggest, parsePreferences, recommend } from '@/lib/mockAi'
import { AiTransportError, createAiService } from '@/services/aiService'
import { useMenuStore } from '@/stores/menu'
import { useChatStore } from '@/stores/chat'

const menuData = normalizeMenu(nestedMenuRows())
const foods = menuData.restaurants.flatMap((r) => r.foods)
const ids = new Set(foods.map((f) => f.id))
const byId = (id) => foods.find((f) => f.id === id)
const categorySlugOf = (f) => menuData.categories.find((c) => c.id === f.categoryId)?.slug
const ask = (q) => mockSuggest(q, foods, { categorySlugOf })
const picked = (q) => ask(q).foodIds.map(byId)

describe('parsePreferences', () => {
  it('nhận ra cay, không cay, chay, ít calo', () => {
    expect(parsePreferences('Món CAY nhé').tags).toContain('cay')
    expect(parsePreferences('không ăn được cay').avoidTags).toEqual(['cay'])
    expect(parsePreferences('không ăn được cay').tags).not.toContain('cay')
    expect(parsePreferences('đồ chay').tags).toContain('chay')
    expect(parsePreferences('đang giảm cân').tags).toContain('it-calo')
  })

  it('đọc mức calo tối đa', () => {
    expect(parsePreferences('dưới 500 calo').maxCalories).toBe(500)
    expect(parsePreferences('< 400 kcal').maxCalories).toBe(400)
    expect(parsePreferences('300 calo trở xuống').maxCalories).toBe(300)
  })

  it('đọc mức giá tối đa', () => {
    expect(parsePreferences('dưới 50k').maxPrice).toBe(50_000)
    expect(parsePreferences('không quá 60.000đ').maxPrice).toBe(60_000)
    expect(parsePreferences('món gì rẻ rẻ').maxPrice).toBe(50_000)
    expect(parsePreferences('dưới 500 calo').maxPrice).toBeNull()
  })

  it('nhận ra danh mục và câu chào', () => {
    expect(parsePreferences('trà sữa').categories).toContain('do-uong')
    expect(parsePreferences('Chào bạn').greeting).toBe(true)
  })
})

describe('Mock AI gợi ý món', () => {
  it('cay: món cay sẵn hoặc chọn được độ cay', () => {
    const result = picked('món cay')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((f) => f.tags.includes('cay') || f.hasSpice)).toBe(true)
    expect(result[0].tags).toContain('cay')
  })

  it('không cay: không có món mang tag cay', () => {
    const result = picked('không ăn cay, muốn no lâu')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((f) => f.tags.includes('cay'))).toBe(false)
  })

  it('chay: chỉ món chay', () => {
    const result = picked('ăn chay')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((f) => f.tags.includes('chay'))).toBe(true)
  })

  it('ít calo: chỉ món ít calo', () => {
    const result = picked('món ít calo')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((f) => f.tags.includes('it-calo'))).toBe(true)
  })

  it('dưới N calo là điều kiện cứng', () => {
    for (const q of ['món cay dưới 500 calo', 'đồ ăn dưới 300 kcal']) {
      const max = parsePreferences(q).maxCalories
      const result = picked(q)
      expect(result.length).toBeGreaterThan(0)
      expect(result.every((f) => f.calories <= max)).toBe(true)
    }
  })

  it('đồ uống, đồ ngọt, tên món', () => {
    expect(picked('đồ uống mát lạnh').every((f) => categorySlugOf(f) === 'do-uong')).toBe(true)
    expect(picked('tráng miệng ngọt').every((f) => f.tags.includes('ngot'))).toBe(true)
    expect(picked('trà sữa')[0].name).toBe('Trà sữa trân châu đường đen')
  })

  it('không bao giờ gợi ý món hết hàng', () => {
    const outOfStock = foods.filter((f) => f.stock === 0).map((f) => f.id)
    for (const q of ['mì xào', 'trà hoa cúc', 'nhẹ bụng', 'chào']) {
      expect(ask(q).foodIds.some((id) => outOfStock.includes(id))).toBe(false)
    }
  })

  it('luôn trả id có thật, tối đa vài món, câu trả lời tiếng Việt', () => {
    for (const q of ['', 'chào', 'cay', 'dưới 50k', 'pizza', 'xyz không hiểu', 'dưới 10 calo']) {
      const { reply, foodIds } = ask(q)
      expect(reply.length).toBeGreaterThan(10)
      expect(foodIds.length).toBeLessThanOrEqual(MAX_SUGGESTIONS)
      expect(foodIds.every((id) => ids.has(id))).toBe(true)
    }
  })

  it('không có món phù hợp thì nói rõ và không gợi ý bừa', () => {
    const { reply, foodIds } = ask('món chay dưới 50 calo')
    expect(foodIds).toEqual([])
    expect(reply).toContain('chưa tìm thấy')
  })

  it('recommend lọc theo giá', () => {
    const result = recommend(foods, parsePreferences('dưới 30k'))
    expect(result.every((f) => f.basePrice <= 30_000)).toBe(true)
  })
})

describe('AI service', () => {
  const service = (transport, extra = {}) =>
    createAiService({ getFoods: () => foods, categorySlugOf, transport, ...extra })

  it('không có transport thì dùng Mock', async () => {
    const result = await service(null).suggest('ăn chay')
    expect(result.source).toBe('mock')
    expect(result.foods.every((f) => f.tags.includes('chay'))).toBe(true)
  })

  it('dùng câu trả lời của AI thật, bỏ id không tồn tại và id trùng', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ reply: ' Gợi ý nè ', foodIds: [1, 99999, 1, '3'] })
    const result = await service(transport).suggest('gì cũng được', [{ role: 'user', text: 'hi' }])
    expect(result).toMatchObject({ reply: 'Gợi ý nè', source: 'gemini', notice: null })
    expect(result.foods.map((f) => f.id)).toEqual([1, 3])
    expect(transport).toHaveBeenCalledWith('gì cũng được', [{ role: 'user', text: 'hi' }], {
      signal: expect.any(AbortSignal),
    })
  })

  it('transport lỗi thì chuyển sang Mock', async () => {
    const result = await service(vi.fn().mockRejectedValue(new Error('500'))).suggest('ăn chay')
    expect(result.source).toBe('mock')
    expect(result.foods.length).toBeGreaterThan(0)
  })

  it('phản hồi sai cấu trúc thì chuyển sang Mock', async () => {
    for (const bad of [
      null,
      { reply: '', foodIds: [] },
      { reply: 'x' },
      { reply: 'x', foodIds: ['a'] },
    ]) {
      const result = await service(vi.fn().mockResolvedValue(bad)).suggest('cay')
      expect(result.source).toBe('mock')
    }
  })

  it('quá thời gian thì hủy request và chuyển sang Mock', async () => {
    let aborted = false
    const transport = (message, history, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    const result = await service(transport, { timeoutMs: 10 }).suggest('ngọt')
    expect(aborted).toBe(true)
    expect(result.source).toBe('mock')
  })

  it('bị giới hạn số lần hỏi thì báo khách', async () => {
    const transport = vi.fn().mockRejectedValue(new AiTransportError('rate_limited'))
    const result = await service(transport).suggest('cay')
    expect(result.source).toBe('mock')
    expect(result.notice).toContain('hỏi hơi nhanh')
  })

  it('cắt câu hỏi quá dài', async () => {
    const transport = vi.fn().mockResolvedValue({ reply: 'ok', foodIds: [] })
    await service(transport).suggest('a'.repeat(2000))
    expect(transport.mock.calls[0][0]).toHaveLength(500)
  })
})

describe('chat store', () => {
  let chat

  beforeEach(() => {
    setActivePinia(createPinia())
    const menu = useMenuStore()
    menu.categories = menuData.categories
    menu.restaurants = menuData.restaurants
    menu.status = 'ready'
    chat = useChatStore()
  })

  it('gửi câu hỏi, nhận câu trả lời kèm id món, giữ lịch sử', async () => {
    await chat.send('  ăn chay  ')
    await chat.send('món ngọt')
    expect(chat.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(chat.messages[0].text).toBe('ăn chay')
    expect(chat.messages[1].source).toBe('mock')
    expect(chat.messages[1].foodIds.every((id) => ids.has(id))).toBe(true)
    expect(chat.thinking).toBe(false)
  })

  it('gửi lịch sử các lượt trước cho AI', async () => {
    const suggest = vi
      .fn()
      .mockResolvedValue({ reply: 'ok', foods: [], source: 'gemini', notice: null })
    chat.useService({ suggest })
    await chat.send('câu 1')
    await chat.send('câu 2')
    expect(suggest.mock.calls[1][1]).toEqual([
      { role: 'user', text: 'câu 1' },
      { role: 'assistant', text: 'ok' },
    ])
  })

  it('bỏ qua tin rỗng và không gửi chồng khi đang suy nghĩ', async () => {
    let resolve
    const suggest = vi.fn(() => new Promise((r) => (resolve = r)))
    chat.useService({ suggest })
    await chat.send('   ')
    const first = chat.send('a')
    await vi.waitFor(() => expect(suggest).toHaveBeenCalled())
    expect(chat.thinking).toBe(true)
    chat.send('b')
    resolve({ reply: 'ok', foods: [], source: 'mock', notice: null })
    await first
    expect(suggest).toHaveBeenCalledTimes(1)
  })

  it('lỗi bất ngờ vẫn trả lời khách', async () => {
    chat.useService({ suggest: vi.fn().mockRejectedValue(new Error('boom')) })
    await chat.send('a')
    expect(chat.messages.at(-1)).toMatchObject({ role: 'assistant', source: 'error' })
  })
})
