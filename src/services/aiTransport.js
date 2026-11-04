// Gọi Vercel Function /api/suggest từ trình duyệt.
// Mọi lỗi được ném ra dưới dạng AiTransportError để AI service chuyển sang Mock.
import { AiTransportError } from './aiService'

export const SUGGEST_ENDPOINT = '/api/suggest'

export function createHttpTransport({ endpoint = SUGGEST_ENDPOINT, fetchImpl = fetch } = {}) {
  return async function transport(message, history, { signal } = {}) {
    let response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal,
      })
    } catch (err) {
      throw new AiTransportError('unavailable', { cause: err })
    }

    if (response.status === 429) {
      throw new AiTransportError('rate_limited', {
        retryAfter: Number(response.headers.get('Retry-After')) || undefined,
      })
    }
    // 404 khi chạy `npm run dev` (không có Function), 5xx khi thiếu key hoặc Gemini lỗi.
    if (!response.ok) throw new AiTransportError('unavailable')

    try {
      return await response.json()
    } catch (err) {
      throw new AiTransportError('invalid_response', { cause: err })
    }
  }
}
