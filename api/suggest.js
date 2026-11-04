// Vercel Function: POST /api/suggest → { reply, foodIds }
// Logic nằm trong server/suggest.js. Handler giữ ở phạm vi module để bộ đếm
// giới hạn số lần gọi và cache thực đơn sống qua các request của cùng một instance.
import { createSuggestHandler } from '../server/suggest.js'

const handle = createSuggestHandler()

export function POST(request) {
  return handle(request)
}

export function GET(request) {
  return handle(request)
}
