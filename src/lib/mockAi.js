// Mock AI: gợi ý món theo luật, dựa trên từ khóa tiếng Việt trong câu hỏi.
// Dùng khi chưa có Gemini, hoặc khi Gemini lỗi / chậm / hết lượt.
// Hàm thuần: nhận câu hỏi và danh sách món, trả về câu trả lời và id món có thật.
import { normalizeText } from './text'
import { formatVND } from './format'

export const MAX_SUGGESTIONS = 4

// Mỗi nhóm: các cụm từ (đã bỏ dấu) → tag khẩu vị của món.
const TAG_RULES = [
  { tag: 'chay', label: 'món chay', phrases: ['chay', 'an chay', 'thuan chay', 'khong thit'] },
  {
    tag: 'it-calo',
    label: 'ít calo',
    phrases: ['it calo', 'giam can', 'an kieng', 'eat clean', 'healthy', 'lanh manh', 'giu dang'],
  },
  {
    tag: 'giau-dam',
    label: 'giàu đạm',
    phrases: ['giau dam', 'nhieu dam', 'protein', 'tap gym', 'gym', 'tang co'],
  },
  {
    tag: 'no-lau',
    label: 'no lâu',
    phrases: ['no lau', 'an no', 'that no', 'doi bung', 'dang doi', 'doi qua', 'an nhieu'],
  },
  { tag: 'nhe-bung', label: 'nhẹ bụng', phrases: ['nhe bung', 'an nhe', 'mon nhe', 'de tieu'] },
  {
    tag: 'ngot',
    label: 'đồ ngọt',
    phrases: ['ngot', 'trang mieng', 'banh ngot', 'an vat ngot', 'dessert'],
  },
  {
    tag: 'mat-lanh',
    label: 'mát lạnh',
    phrases: ['mat lanh', 'giai nhiet', 'giai khat', 'nong qua', 'troi nong', 'do uong lanh'],
  },
]

// Từ khóa gợi ý danh mục (theo slug danh mục của món).
const CATEGORY_RULES = [
  {
    slug: 'do-uong',
    label: 'đồ uống',
    phrases: ['do uong', 'nuoc uong', 'uong gi', 'tra sua', 'ca phe', 'cafe', 'nuoc ep', 'sinh to'],
  },
  { slug: 'trang-mieng', label: 'tráng miệng', phrases: ['trang mieng', 'banh kem', 'kem'] },
  { slug: 'bun-pho', label: 'bún, phở', phrases: ['pho', 'bun', 'mon nuoc', 'an sang'] },
  { slug: 'com', label: 'cơm', phrases: ['com', 'an trua'] },
  {
    slug: 'fast-food',
    label: 'burger, pizza',
    phrases: ['burger', 'pizza', 'ga ran', 'fast food', 'my y'],
  },
  { slug: 'healthy', label: 'healthy', phrases: ['salad', 'poke', 'healthy'] },
]

const GREETINGS = ['xin chao', 'chao', 'hello', 'hi', 'alo', 'hey']

const STOPWORDS = new Set([
  'mon',
  'an',
  'gi',
  'cho',
  'toi',
  'minh',
  'muon',
  'can',
  'nao',
  'co',
  'la',
  'va',
  'do',
  'nhe',
])

function bigrams(text) {
  const words = text.split(' ').filter((w) => w.length > 1)
  const result = []
  for (let i = 0; i < words.length - 1; i++) {
    if (STOPWORDS.has(words[i]) && STOPWORDS.has(words[i + 1])) continue
    result.push(`${words[i]} ${words[i + 1]}`)
  }
  return result
}

const has = (text, phrase) => new RegExp(`(^|[^a-z0-9])${phrase}([^a-z0-9]|$)`).test(text)

/**
 * Đọc nhu cầu từ câu hỏi.
 * @returns {{ tags: string[], avoidTags: string[], categories: string[],
 *             maxCalories: number|null, maxPrice: number|null, greeting: boolean }}
 */
export function parsePreferences(message) {
  const text = normalizeText(message)
  const prefs = {
    tags: [],
    avoidTags: [],
    categories: [],
    maxCalories: null,
    maxPrice: null,
    greeting: GREETINGS.some((g) => has(text, g)),
    /** Cụm 2 từ trong câu hỏi, để ưu tiên món có tên trùng (ví dụ "trà sữa"). */
    phrases: bigrams(text),
  }

  // "không cay", "ít cay quá thì thôi" → tránh món cay; "cay" → muốn món cay.
  if (/(khong|ko|k|chang|it)\s+(an\s+)?(duoc\s+)?cay/.test(text)) prefs.avoidTags.push('cay')
  else if (has(text, 'cay')) prefs.tags.push('cay')

  for (const rule of TAG_RULES) {
    if (rule.phrases.some((p) => has(text, p))) prefs.tags.push(rule.tag)
  }
  for (const rule of CATEGORY_RULES) {
    if (rule.phrases.some((p) => has(text, p))) prefs.categories.push(rule.slug)
  }

  // "dưới 500 calo", "< 400 kcal", "400 calo trở xuống", "tối đa 300 calo"
  const calories =
    text.match(/(?:duoi|<|toi da|khong qua|it hon)\s*(\d{2,4})\s*(?:calo|kcal|cal)/) ??
    text.match(/(\d{2,4})\s*(?:calo|kcal|cal)\s*(?:tro xuong|do lai)/)
  if (calories) prefs.maxCalories = Number(calories[1])

  // "dưới 50k", "dưới 60.000đ", "rẻ"
  const price = text.match(
    /(?:duoi|<|toi da|khong qua|re hon)\s*(\d{1,3}(?:[.,]\d{3})*)\s*(k|nghin|ngan|000|d|dong)?/,
  )
  if (price && !calories?.[0].includes(price[0])) {
    const raw = Number(price[1].replace(/[.,]/g, ''))
    const value =
      price[2] === 'k' || price[2] === 'nghin' || price[2] === 'ngan' || raw < 1000
        ? raw * 1000
        : raw
    if (value >= 10_000) prefs.maxPrice = value
  } else if (has(text, 're') || has(text, 'tiet kiem') || has(text, 'sinh vien')) {
    prefs.maxPrice = 50_000
  }

  prefs.tags = [...new Set(prefs.tags)]
  prefs.categories = [...new Set(prefs.categories)]
  return prefs
}

const hasCriteria = (p) =>
  p.tags.length || p.avoidTags.length || p.categories.length || p.maxCalories || p.maxPrice

/**
 * Chấm điểm và lọc món theo nhu cầu. Chỉ trả món còn hàng.
 * Điều kiện cứng: calo, giá, tag cần tránh. Điều kiện mềm (cộng điểm): tag, danh mục.
 */
export function recommend(
  foods,
  prefs,
  { categorySlugOf = () => null, limit = MAX_SUGGESTIONS } = {},
) {
  const scored = foods
    .filter((f) => f.stock > 0)
    .filter((f) => prefs.maxCalories == null || f.calories <= prefs.maxCalories)
    .filter((f) => prefs.maxPrice == null || f.basePrice <= prefs.maxPrice)
    .filter((f) => !prefs.avoidTags.some((t) => f.tags.includes(t)))
    .map((f) => {
      // Món cay sẵn khớp 'cay' trọn điểm; món chọn được độ cay khớp một nửa.
      const tagScore = prefs.tags.reduce(
        (sum, t) => sum + (f.tags.includes(t) ? 2 : t === 'cay' && f.hasSpice ? 1 : 0),
        0,
      )
      const categoryHit = prefs.categories.includes(categorySlugOf(f)) ? 1.5 : 0
      const name = normalizeText(f.name)
      const nameHit = (prefs.phrases ?? []).some((p) => name.includes(p)) ? 3 : 0
      return { food: f, score: tagScore + categoryHit + nameHit }
    })

  // Có yêu cầu tag/danh mục thì món phải khớp ít nhất một điều.
  const wantsSoft = prefs.tags.length || prefs.categories.length
  const matched = wantsSoft ? scored.filter((s) => s.score > 0) : scored

  return matched
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.food.isFeatured) - Number(a.food.isFeatured) ||
        a.food.calories - b.food.calories,
    )
    .slice(0, limit)
    .map((s) => s.food)
}

function describe(prefs, categoryLabel) {
  const parts = []
  for (const tag of prefs.tags) {
    if (tag === 'cay') parts.push('cay')
    else parts.push(TAG_RULES.find((r) => r.tag === tag)?.label ?? tag)
  }
  if (prefs.avoidTags.includes('cay')) parts.push('không cay')
  for (const slug of prefs.categories) parts.push(categoryLabel(slug))
  if (prefs.maxCalories) parts.push(`dưới ${prefs.maxCalories} kcal`)
  if (prefs.maxPrice) parts.push(`giá dưới ${formatVND(prefs.maxPrice)}`)
  return parts.join(', ')
}

/**
 * Trả lời một câu hỏi bằng luật.
 * @param foods  món trong thực đơn (đối tượng miền từ menu store)
 * @param categorySlugOf (food) => slug danh mục
 * @returns {{ reply: string, foodIds: number[] }}
 */
export function mockSuggest(message, foods, { categorySlugOf = () => null } = {}) {
  const prefs = parsePreferences(message)
  const categoryLabel = (slug) => CATEGORY_RULES.find((r) => r.slug === slug)?.label ?? slug

  const spicyByChoice = prefs.tags.includes('cay')

  if (!hasCriteria(prefs)) {
    const picks = recommend(foods, prefs, { categorySlugOf }).filter((f) => f.isFeatured)
    const fallback = picks.length ? picks : recommend(foods, prefs, { categorySlugOf })
    return {
      reply: `${prefs.greeting ? 'Chào bạn! ' : ''}Mình là trợ lý gợi ý món của FoodieGo. Bạn có thể hỏi kiểu “món cay dưới 500 calo”, “đồ chay nhẹ bụng” hay “đồ uống mát lạnh”. Trong lúc chờ, đây là vài món được nhiều người thích:`,
      foodIds: fallback.slice(0, MAX_SUGGESTIONS).map((f) => f.id),
    }
  }

  const picks = recommend(foods, prefs, { categorySlugOf })
  const wanted = describe(prefs, categoryLabel)
  if (!picks.length) {
    return {
      reply: `Mình chưa tìm thấy món nào ${wanted} còn hàng. Bạn thử nới điều kiện, ví dụ tăng mức calo hoặc bỏ bớt yêu cầu nhé.`,
      foodIds: [],
    }
  }
  const lines = picks.map((f) => `${f.name} (${f.calories} kcal, ${formatVND(f.basePrice)})`)
  const spiceNote =
    spicyByChoice && picks.some((f) => f.hasSpice && !f.tags.includes('cay'))
      ? ' Một số món bạn tự chọn độ cay ở trang món.'
      : ''
  return {
    reply: `Với yêu cầu ${wanted}, mình gợi ý ${picks.length} món: ${lines.join('; ')}.${spiceNote} Bấm “Thêm vào giỏ” để đặt ngay nhé!`,
    foodIds: picks.map((f) => f.id),
  }
}
