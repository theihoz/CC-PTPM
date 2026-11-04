// AI gợi ý món. Phần gọi mạng (transport) được truyền vào để test và để thay
// đổi nguồn AI mà không sửa giao diện:
//   transport(message, history, { signal }) → Promise<{ reply: string, foodIds: number[] }>
// Không có transport, hoặc transport lỗi / quá thời gian / trả sai cấu trúc
// → dùng Mock AI (luật), nên chatbot luôn trả lời được.
import { mockSuggest } from '@/lib/mockAi'

/** Lâu hơn tổng thời gian Function thử các model Gemini (20 giây). */
export const AI_TIMEOUT_MS = 25_000
export const MAX_MESSAGE_LENGTH = 500

export class AiTransportError extends Error {
  constructor(code, { cause, retryAfter } = {}) {
    super(code, { cause })
    this.name = 'AiTransportError'
    /** 'rate_limited' | 'unavailable' | 'invalid_response' | 'timeout' */
    this.code = code
    this.retryAfter = retryAfter
  }
}

function isValidResponse(data) {
  return (
    data &&
    typeof data.reply === 'string' &&
    data.reply.trim().length > 0 &&
    Array.isArray(data.foodIds) &&
    data.foodIds.every((id) => Number.isInteger(Number(id)))
  )
}

/**
 * @param getFoods        () => món trong thực đơn (đối tượng miền)
 * @param categorySlugOf  (food) => slug danh mục, cho Mock AI
 * @param transport       hàm gọi AI thật; null để luôn dùng Mock
 */
export function createAiService({
  getFoods,
  categorySlugOf = () => null,
  transport = null,
  timeoutMs = AI_TIMEOUT_MS,
}) {
  /** Chỉ giữ id có thật trong thực đơn, bỏ trùng, giữ thứ tự AI đưa ra. */
  function resolveFoods(foodIds) {
    const byId = new Map(getFoods().map((f) => [f.id, f]))
    const seen = new Set()
    return foodIds
      .map(Number)
      .filter((id) => !seen.has(id) && seen.add(id))
      .map((id) => byId.get(id))
      .filter(Boolean)
  }

  function fromMock(message, notice = null) {
    const { reply, foodIds } = mockSuggest(message, getFoods(), { categorySlugOf })
    return { reply, foods: resolveFoods(foodIds), source: 'mock', notice }
  }

  async function callTransport(message, history) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const data = await transport(message, history, { signal: controller.signal })
      if (!isValidResponse(data)) throw new AiTransportError('invalid_response')
      return data
    } catch (err) {
      if (controller.signal.aborted) throw new AiTransportError('timeout', { cause: err })
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * @param message  câu hỏi của khách
   * @param history  [{ role: 'user' | 'assistant', text }] các lượt trước
   * @returns {{ reply, foods, source: 'gemini' | 'mock', notice }}
   *   notice: ghi chú cho khách khi phải dùng Mock (ví dụ hỏi quá nhanh), hoặc null
   */
  async function suggest(message, history = []) {
    const text = String(message ?? '')
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH)
    if (!transport) return fromMock(text)

    try {
      const data = await callTransport(text, history)
      const foods = resolveFoods(data.foodIds)
      return { reply: data.reply.trim(), foods, source: 'gemini', notice: null }
    } catch (err) {
      const notice =
        err?.code === 'rate_limited'
          ? 'Bạn hỏi hơi nhanh, mình tạm dùng gợi ý nhanh. Đợi một chút rồi hỏi tiếp nhé.'
          : null
      return fromMock(text, notice)
    }
  }

  return { suggest }
}
