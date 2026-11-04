// Logic thuần của thực đơn: chuẩn hóa dữ liệu từ database, tìm kiếm, lọc, sắp xếp,
// trạng thái mở cửa và tồn kho. Không phụ thuộc Vue hay Supabase nên test trực tiếp được.
import { LOW_STOCK_THRESHOLD, RESTAURANT_TIME_ZONE } from './constants'
import { normalizeText } from './text'

const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
const hhmm = (time) => String(time ?? '').slice(0, 5)

function toFood(row) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    name: row.name,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    basePrice: Number(row.base_price),
    calories: Number(row.calories ?? 0),
    tags: row.tags ?? [],
    stock: Number(row.stock ?? 0),
    hasSpice: Boolean(row.has_spice),
    isFeatured: Boolean(row.is_featured),
    sizes: [...(row.food_sizes ?? [])].sort(bySortOrder).map((s) => ({
      id: Number(s.id),
      name: s.name,
      priceDelta: Number(s.price_delta ?? 0),
      isDefault: Boolean(s.is_default),
    })),
    toppings: [...(row.food_toppings ?? [])].sort(bySortOrder).map((t) => ({
      id: Number(t.id),
      name: t.name,
      price: Number(t.price ?? 0),
    })),
  }
}

/**
 * Chuyển dữ liệu thô của Supabase (snake_case, quan hệ lồng nhau) thành đối tượng miền.
 * @param {{ categories: object[], restaurants: object[] }} rows
 */
export function normalizeMenu({ categories, restaurants }) {
  return {
    categories: [...categories].sort(bySortOrder).map((c) => ({
      id: Number(c.id),
      slug: c.slug,
      name: c.name,
      icon: c.icon,
    })),
    restaurants: [...restaurants]
      .sort((a, b) => a.id - b.id)
      .map((r) => ({
        id: Number(r.id),
        slug: r.slug,
        name: r.name,
        description: r.description ?? '',
        imageUrl: r.image_url ?? '',
        address: r.address ?? '',
        categoryId: r.category_id == null ? null : Number(r.category_id),
        rating: Number(r.rating ?? 0),
        ratingCount: Number(r.rating_count ?? 0),
        deliveryTimeMin: Number(r.delivery_time_min ?? 0),
        openTime: hhmm(r.open_time),
        closeTime: hhmm(r.close_time),
        isFeatured: Boolean(r.is_featured),
        foods: [...(r.foods ?? [])]
          .filter((f) => f.is_available !== false)
          .sort(bySortOrder)
          .map(toFood),
      })),
  }
}

export const SORT_OPTIONS = [
  { value: 'rating', label: 'Đánh giá cao' },
  { value: 'delivery', label: 'Giao nhanh' },
  { value: 'name', label: 'Tên A → Z' },
]

export const DEFAULT_SORT = 'rating'

const comparators = {
  rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
  delivery: (a, b) => a.deliveryTimeMin - b.deliveryTimeMin || b.rating - a.rating,
  name: (a, b) => a.name.localeCompare(b.name, 'vi'),
}

/** Trả về giá trị sort hợp lệ; giá trị lạ trên URL rơi về mặc định. */
export function normalizeSort(value) {
  return Object.hasOwn(comparators, value) ? value : DEFAULT_SORT
}

/**
 * Tìm kiếm, lọc và sắp xếp quán.
 * - `q`: khớp tên quán, mô tả hoặc tên món (không phân biệt dấu, hoa thường).
 * - `category`: slug danh mục; quán khớp nếu danh mục chính trùng hoặc có món thuộc danh mục đó.
 * - `sort`: 'rating' | 'delivery' | 'name'.
 */
export function filterRestaurants(restaurants, categories, { q = '', category = '', sort } = {}) {
  const query = normalizeText(q)
  const categoryId = category ? (categories.find((c) => c.slug === category)?.id ?? -1) : null

  return restaurants
    .filter((r) => {
      if (categoryId !== null) {
        const inCategory =
          r.categoryId === categoryId || r.foods.some((f) => f.categoryId === categoryId)
        if (!inCategory) return false
      }
      if (!query) return true
      return (
        normalizeText(r.name).includes(query) ||
        normalizeText(r.description).includes(query) ||
        r.foods.some((f) => normalizeText(f.name).includes(query))
      )
    })
    .sort(comparators[normalizeSort(sort)])
}

/** Tên các món khớp từ khóa, để hiển thị lý do một quán xuất hiện trong kết quả. */
export function matchingFoodNames(restaurant, q, limit = 2) {
  const query = normalizeText(q)
  if (!query) return []
  return restaurant.foods
    .filter((f) => normalizeText(f.name).includes(query))
    .slice(0, limit)
    .map((f) => f.name)
}

function minutesOf(hhmmValue) {
  const [h, m] = hhmmValue.split(':').map(Number)
  return h * 60 + m
}

function minutesNowIn(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return get('hour') * 60 + get('minute')
}

/** Quán có đang mở cửa không (giờ Việt Nam). Hỗ trợ giờ đóng qua nửa đêm. */
export function isOpenAt(restaurant, date = new Date()) {
  const now = minutesNowIn(RESTAURANT_TIME_ZONE, date)
  const open = minutesOf(restaurant.openTime)
  const close = minutesOf(restaurant.closeTime)
  if (open === close) return true
  return open < close ? now >= open && now < close : now >= open || now < close
}

/** 'out' khi hết hàng, 'low' khi sắp hết, 'ok' khi còn nhiều. */
export function stockStatus(stock) {
  if (stock <= 0) return 'out'
  if (stock <= LOW_STOCK_THRESHOLD) return 'low'
  return 'ok'
}
