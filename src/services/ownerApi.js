// Lớp mỏng bọc các RPC của chủ quán. Store chỉ gọi qua đây.
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export class OwnerError extends Error {
  constructor(code, { cause } = {}) {
    super(code, { cause })
    this.name = 'OwnerError'
    /**
     * 'not_configured' | 'not_authenticated' | 'invalid_restaurant' | 'no_restaurant' |
     * 'food_not_found' | 'invalid_food' | 'network'
     */
    this.code = code
  }
}

const KNOWN = [
  'not_authenticated',
  'invalid_restaurant',
  'no_restaurant',
  'food_not_found',
  'invalid_food',
]

function client() {
  if (!isSupabaseConfigured) throw new OwnerError('not_configured')
  return supabase
}

function fail(error) {
  throw new OwnerError(KNOWN.includes(error?.message) ? error.message : 'network', {
    cause: error,
  })
}

const hhmm = (time) => String(time ?? '').slice(0, 5)

function toRestaurant(row) {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    address: row.address ?? '',
    categoryId: row.category_id == null ? null : Number(row.category_id),
    deliveryTimeMin: Number(row.delivery_time_min),
    openTime: hhmm(row.open_time),
    closeTime: hhmm(row.close_time),
    isOpen: row.is_open !== false,
    rating: Number(row.rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
  }
}

/** Quán của người đang đăng nhập, hoặc null khi chưa đăng ký quán. */
export async function fetchMyRestaurant() {
  const { data, error } = await client().rpc('my_restaurant')
  if (error) fail(error)
  const row = Array.isArray(data) ? data[0] : data
  return row ? toRestaurant(row) : null
}

/**
 * Đăng ký quán mới (chưa có quán) hoặc sửa quán của mình.
 * @returns {{ id: number, slug: string, created: boolean }}
 */
export async function saveMyRestaurant(payload) {
  const { data, error } = await client().rpc('save_my_restaurant', { payload })
  if (error) fail(error)
  return { id: Number(data.id), slug: data.slug, created: Boolean(data.created) }
}

function toFood(row) {
  return {
    id: Number(row.id),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    name: row.name,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    basePrice: Number(row.base_price),
    calories: Number(row.calories ?? 0),
    tags: row.tags ?? [],
    stock: Number(row.stock ?? 0),
    hasSpice: Boolean(row.has_spice),
    isAvailable: row.is_available !== false,
    sizes: (row.sizes ?? []).map((s) => ({
      id: Number(s.id),
      name: s.name,
      priceDelta: Number(s.priceDelta ?? 0),
      isDefault: Boolean(s.isDefault),
    })),
    toppings: (row.toppings ?? []).map((t) => ({
      id: Number(t.id),
      name: t.name,
      price: Number(t.price ?? 0),
    })),
  }
}

/** Mọi món của quán mình, kể cả món Ngừng bán, kèm size và topping. */
export async function fetchMyFoods() {
  const { data, error } = await client().rpc('my_foods')
  if (error) fail(error)
  return (data ?? []).map(toFood)
}

/** Thêm món (payload không có id) hoặc sửa món của quán mình. @returns {{ id: number, created: boolean }} */
export async function saveFood(payload) {
  const { data, error } = await client().rpc('save_food', { payload })
  if (error) fail(error)
  return { id: Number(data.id), created: Boolean(data.created) }
}

/** Xóa hẳn một món của quán mình. */
export async function deleteFood(foodId) {
  const { error } = await client().rpc('delete_food', { food_id: foodId })
  if (error) fail(error)
}
