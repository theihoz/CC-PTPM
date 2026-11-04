import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createAiService } from '@/services/aiService'
import { createHttpTransport } from '@/services/aiTransport'
import { useMenuStore } from './menu'

let nextId = 1
const HISTORY_TURNS = 6

/**
 * Hội thoại với trợ lý AI. Nằm trong Pinia nên lịch sử còn nguyên khi chuyển trang.
 * Tin nhắn trợ lý chỉ lưu id món; thẻ món đọc lại từ thực đơn nên giá, tồn kho luôn mới.
 */
export const useChatStore = defineStore('chat', () => {
  const menu = useMenuStore()

  const open = ref(false)
  const thinking = ref(false)
  /** [{ id, role: 'user' | 'assistant', text, foodIds, source, notice }] */
  const messages = ref([])

  // Gemini qua /api/suggest; Function lỗi hoặc không có (npm run dev) thì tự dùng Mock AI.
  let service = createAiService({
    getFoods: () => menu.foods,
    categorySlugOf: (food) => menu.categoryById(food.categoryId)?.slug ?? null,
    transport: createHttpTransport(),
  })

  /** Thay nguồn AI (bản giả trong test). */
  function useService(next) {
    service = next
  }

  async function send(text) {
    const message = String(text ?? '').trim()
    if (!message || thinking.value) return

    const history = messages.value
      .slice(-HISTORY_TURNS)
      .map(({ role, text: content }) => ({ role, text: content }))
    messages.value.push({ id: nextId++, role: 'user', text: message })
    thinking.value = true
    try {
      await menu.load()
      const result = await service.suggest(message, history)
      messages.value.push({
        id: nextId++,
        role: 'assistant',
        text: result.reply,
        foodIds: result.foods.map((f) => f.id),
        source: result.source,
        notice: result.notice,
      })
    } catch (err) {
      console.error('[chat] Không trả lời được', err)
      messages.value.push({
        id: nextId++,
        role: 'assistant',
        text: 'Xin lỗi, mình đang gặp trục trặc. Bạn thử hỏi lại sau ít phút nhé.',
        foodIds: [],
        source: 'error',
      })
    } finally {
      thinking.value = false
    }
  }

  function reset() {
    messages.value = []
  }

  return { open, thinking, messages, send, reset, useService }
})
