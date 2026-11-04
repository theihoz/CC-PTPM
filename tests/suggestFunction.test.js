// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  RATE_LIMIT,
  buildInput,
  buildSystemInstruction,
  cleanSecret,
  modelChain,
  thinkingLevelFor,
  DEFAULT_MODELS,
  createRateLimiter,
  createSuggestHandler,
  extractText,
  parseBody,
} from '../server/suggest.js'
import { createHttpTransport } from '@/services/aiTransport'
import { AiTransportError } from '@/services/aiService'

const ENV = {
  GEMINI_API_KEY: 'test-key',
  VITE_SUPABASE_URL: 'https://db.example.co',
  VITE_SUPABASE_ANON_KEY: 'anon',
}

const MENU_ROWS = [
  {
    id: 1,
    name: 'Phở bò tái',
    calories: 450,
    tags: ['giau-dam'],
    stock: 30,
    base_price: 55000,
    restaurants: { name: 'Phở Hà Thành' },
    categories: { name: 'Bún & Phở' },
  },
  {
    id: 3,
    name: 'Phở gà',
    calories: 400,
    tags: ['nhe-bung'],
    stock: 25,
    base_price: 50000,
    restaurants: { name: 'Phở Hà Thành' },
    categories: { name: 'Bún & Phở' },
  },
]

const geminiReply = (payload) => ({
  id: 'int_1',
  steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(payload) }] }],
})

function fakeFetch({
  gemini = { status: 200, body: geminiReply({ reply: 'Gợi ý phở', foodIds: [1] }) },
  menuStatus = 200,
} = {}) {
  return vi.fn(async (url, init) => {
    if (String(url).includes('/rest/v1/foods')) {
      return new Response(JSON.stringify(MENU_ROWS), { status: menuStatus })
    }
    if (String(url).includes('generativelanguage.googleapis.com')) {
      if (gemini.throws) throw gemini.throws
      return new Response(JSON.stringify(gemini.body), { status: gemini.status })
    }
    throw new Error(`unexpected fetch ${url} ${init?.method}`)
  })
}

const post = (body, ip = '1.2.3.4') =>
  new Request('https://app.test/api/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

describe('POST /api/suggest', () => {
  it('trả lời bằng Gemini, chỉ giữ id có trong thực đơn', async () => {
    const fetchImpl = fakeFetch({
      gemini: {
        status: 200,
        body: geminiReply({ reply: ' Ăn phở nhé ', foodIds: [1, 999, 1, 3, 2] }),
      },
    })
    const handle = createSuggestHandler({ fetchImpl, env: ENV })
    const response = await handle(post({ message: 'ăn gì nhẹ bụng', history: [] }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reply: 'Ăn phở nhé', foodIds: [1, 3] })
  })

  it('gửi đúng request tới Gemini: key ở header, model, schema JSON, không lưu hội thoại', async () => {
    const fetchImpl = fakeFetch()
    const handle = createSuggestHandler({ fetchImpl, env: { ...ENV, GEMINI_MODEL: 'gemini-x' } })
    await handle(
      post({
        message: 'cay',
        history: [
          { role: 'user', text: 'chào' },
          { role: 'assistant', text: 'Chào bạn' },
        ],
      }),
    )
    const [url, init] = fetchImpl.mock.calls.find(([u]) => String(u).includes('googleapis'))
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions')
    expect(url).not.toContain('test-key')
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('gemini-x')
    expect(body.store).toBe(false)
    expect(body.response_format.mime_type).toBe('application/json')
    expect(body.response_format.schema.required).toEqual(['reply', 'foodIds'])
    expect(body.system_instruction).toContain('1 | Phở bò tái | Phở Hà Thành')
    expect(body.input).toBe('Khách: chào\nTrợ lý: Chào bạn\nKhách: cay\nTrợ lý:')
  })

  it('cắt khoảng trắng, xuống dòng, dấu nháy dính vào key và model khi dán', async () => {
    const fetchImpl = fakeFetch()
    await createSuggestHandler({
      fetchImpl,
      env: { ...ENV, GEMINI_API_KEY: '  "test-key"\n', GEMINI_MODEL: ' gemini-y \r\n' },
    })(post({ message: 'a' }))
    const init = fetchImpl.mock.calls.find(([u]) => String(u).includes('googleapis'))[1]
    expect(init.headers['x-goog-api-key']).toBe('test-key')
    expect(JSON.parse(init.body).model).toBe('gemini-y')
    expect(cleanSecret("'abc'")).toBe('abc')
    expect(cleanSecret(undefined)).toBe('')
  })

  it('model mặc định là bản Flash ổn định, thinking ở mức thấp', async () => {
    const fetchImpl = fakeFetch()
    await createSuggestHandler({ fetchImpl, env: ENV })(post({ message: 'a' }))
    const init = fetchImpl.mock.calls.find(([u]) => String(u).includes('googleapis'))[1]
    const body = JSON.parse(init.body)
    expect(body.model).toBe('gemini-3.6-flash')
    expect(body.generation_config).toEqual({ max_output_tokens: 1024, thinking_level: 'low' })
    expect(thinkingLevelFor('gemini-3.5-flash-lite')).toBe('minimal')
  })

  it('một model quá thời gian thì thử model sau', async () => {
    const used = []
    const fetchImpl = vi.fn(async (url, init) => {
      if (String(url).includes('/rest/v1/foods')) return new Response(JSON.stringify(MENU_ROWS))
      const { model } = JSON.parse(init.body)
      used.push(model)
      if (model === 'gemini-3.6-flash') throw new DOMException('timeout', 'TimeoutError')
      return new Response(JSON.stringify(geminiReply({ reply: 'ok', foodIds: [1] })))
    })
    const response = await createSuggestHandler({ fetchImpl, env: ENV })(post({ message: 'a' }))
    expect(response.status).toBe(200)
    expect(used).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
  })

  it('chỉ nhận POST', async () => {
    const handle = createSuggestHandler({ fetchImpl: fakeFetch(), env: ENV })
    const response = await handle(new Request('https://app.test/api/suggest'))
    expect(response.status).toBe(405)
  })

  it('body sai hoặc tin nhắn rỗng thì 400', async () => {
    const handle = createSuggestHandler({ fetchImpl: fakeFetch(), env: ENV })
    expect((await handle(post('{không phải json'))).status).toBe(400)
    expect((await handle(post({ message: '   ' }))).status).toBe(400)
    expect((await handle(post({ text: 'x' }))).status).toBe(400)
  })

  it('thiếu GEMINI_API_KEY thì 503 và không gọi Gemini', async () => {
    const fetchImpl = fakeFetch()
    const response = await createSuggestHandler({ fetchImpl, env: { ...ENV, GEMINI_API_KEY: '' } })(
      post({ message: 'a' }),
    )
    expect(response.status).toBe(503)
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('googleapis'))).toBe(false)
  })

  it('Gemini lỗi, quá thời gian hoặc trả sai cấu trúc thì 5xx', async () => {
    const cases = [
      { status: 500, body: { error: 'x' } },
      { throws: new DOMException('timeout', 'TimeoutError') },
      {
        status: 200,
        body: {
          steps: [{ type: 'model_output', content: [{ type: 'text', text: 'không phải json' }] }],
        },
      },
      { status: 200, body: geminiReply({ reply: '', foodIds: [] }) },
      { status: 200, body: geminiReply({ reply: 'x' }) },
    ]
    for (const gemini of cases) {
      const response = await createSuggestHandler({ fetchImpl: fakeFetch({ gemini }), env: ENV })(
        post({ message: 'a' }),
      )
      expect(response.status).toBeGreaterThanOrEqual(500)
    }
  })

  it('mọi model đều hết lượt thì 429', async () => {
    const response = await createSuggestHandler({
      fetchImpl: fakeFetch({ gemini: { status: 429, body: {} } }),
      env: ENV,
    })(post({ message: 'a' }))
    expect(response.status).toBe(429)
  })

  it('model chính quá tải thì tự thử model dự phòng', async () => {
    const used = []
    const fetchImpl = vi.fn(async (url, init) => {
      if (String(url).includes('/rest/v1/foods')) return new Response(JSON.stringify(MENU_ROWS))
      const { model } = JSON.parse(init.body)
      used.push(model)
      if (model === 'gemini-3.6-flash') {
        return new Response(JSON.stringify({ error: { code: 'service_unavailable' } }), {
          status: 503,
        })
      }
      return new Response(JSON.stringify(geminiReply({ reply: 'Từ model dự phòng', foodIds: [3] })))
    })
    const response = await createSuggestHandler({ fetchImpl, env: ENV })(post({ message: 'a' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reply: 'Từ model dự phòng', foodIds: [3] })
    expect(used).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash-lite'])
  })

  it('lỗi không nên thử lại (400, key sai) thì dừng ngay', async () => {
    const fetchImpl = fakeFetch({ gemini: { status: 400, body: { error: 'API_KEY_INVALID' } } })
    const response = await createSuggestHandler({ fetchImpl, env: ENV })(post({ message: 'a' }))
    expect(response.status).toBe(502)
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).includes('googleapis'))).toHaveLength(1)
  })

  it('GEMINI_MODEL nhận danh sách model', () => {
    expect(modelChain(' a , b,a ')).toEqual(['a', 'b'])
    expect(modelChain('')).toEqual(DEFAULT_MODELS)
    expect(DEFAULT_MODELS[0]).toBe('gemini-3.6-flash')
  })

  it('không đọc được thực đơn thì 503', async () => {
    const response = await createSuggestHandler({
      fetchImpl: fakeFetch({ menuStatus: 500 }),
      env: ENV,
    })(post({ message: 'a' }))
    expect(response.status).toBe(503)
  })

  it('giới hạn số lần gọi theo IP, có Retry-After', async () => {
    const handle = createSuggestHandler({ fetchImpl: fakeFetch(), env: ENV })
    for (let i = 0; i < RATE_LIMIT.max; i++) {
      expect((await handle(post({ message: 'a' }, '9.9.9.9'))).status).toBe(200)
    }
    const limited = await handle(post({ message: 'a' }, '9.9.9.9'))
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await handle(post({ message: 'a' }, '8.8.8.8'))).status).toBe(200)
  })

  it('cache thực đơn giữa các request', async () => {
    const fetchImpl = fakeFetch()
    const handle = createSuggestHandler({ fetchImpl, env: ENV })
    await handle(post({ message: 'a' }))
    await handle(post({ message: 'b' }))
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).includes('/rest/v1/foods'))).toHaveLength(
      1,
    )
  })
})

describe('các hàm phụ của Function', () => {
  it('parseBody cắt tin dài, lọc lịch sử sai, giữ tối đa 6 lượt', () => {
    const history = [
      ...Array.from({ length: 8 }, (_, i) => ({ role: 'user', text: `t${i}` })),
      { role: 'system', text: 'hack' },
    ]
    const parsed = parseBody({ message: 'x'.repeat(900), history })
    expect(parsed.message).toHaveLength(500)
    expect(parsed.history).toHaveLength(6)
    expect(parsed.history.some((t) => t.role === 'system')).toBe(false)
  })

  it('extractText đọc output_text hoặc steps', () => {
    expect(extractText({ output_text: 'a' })).toBe('a')
    expect(extractText(geminiReply({ reply: 'b', foodIds: [] }))).toContain('"reply":"b"')
    expect(extractText({})).toBe('')
  })

  it('system instruction chỉ chứa thực đơn và quy tắc chỉ chọn món có thật', () => {
    const text = buildSystemInstruction([
      {
        id: 7,
        name: 'Cơm',
        restaurant: 'Q',
        category: 'Cơm',
        calories: 500,
        price: 40000,
        tags: ['no-lau'],
      },
    ])
    expect(text).toContain('7 | Cơm | Q | Cơm | 500 kcal | 40000đ | no-lau')
    expect(text).toContain('CHỈ gợi ý món có trong THỰC ĐƠN')
    expect(buildInput('hi', [])).toBe('Khách: hi\nTrợ lý:')
  })

  it('rate limiter mở lại sau khi hết cửa sổ thời gian', () => {
    let t = 0
    const check = createRateLimiter({ windowMs: 1000, max: 1 }, () => t)
    expect(check('a').ok).toBe(true)
    expect(check('a').ok).toBe(false)
    t = 1000
    expect(check('a').ok).toBe(true)
  })
})

describe('HTTP transport phía trình duyệt', () => {
  const respond = (status, body, headers = {}) =>
    vi.fn(
      async () =>
        new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }),
    )

  it('POST tới /api/suggest và trả về JSON', async () => {
    const fetchImpl = respond(200, { reply: 'ok', foodIds: [1] })
    const transport = createHttpTransport({ fetchImpl })
    expect(await transport('cay', [], {})).toEqual({ reply: 'ok', foodIds: [1] })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('/api/suggest')
    expect(JSON.parse(init.body)).toEqual({ message: 'cay', history: [] })
  })

  it('429 thành rate_limited kèm Retry-After', async () => {
    const transport = createHttpTransport({ fetchImpl: respond(429, {}, { 'Retry-After': '30' }) })
    await expect(transport('a', [])).rejects.toMatchObject({ code: 'rate_limited', retryAfter: 30 })
  })

  it('404 (npm run dev), 5xx và lỗi mạng thành unavailable', async () => {
    for (const fetchImpl of [
      respond(404, 'Not Found'),
      respond(503, {}),
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    ]) {
      await expect(createHttpTransport({ fetchImpl })('a', [])).rejects.toBeInstanceOf(
        AiTransportError,
      )
    }
  })

  it('JSON hỏng thành invalid_response', async () => {
    const transport = createHttpTransport({ fetchImpl: respond(200, '{hỏng') })
    await expect(transport('a', [])).rejects.toMatchObject({ code: 'invalid_response' })
  })
})
