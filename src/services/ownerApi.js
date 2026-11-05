// Lớp mỏng bọc các RPC của chủ quán. Store chỉ gọi qua đây.
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export class OwnerError extends Error {
  constructor(code, { cause } = {}) {
    super(code, { cause })
    this.name = 'OwnerError'
    /** 'not_configured' | 'not_authenticated' | 'invalid_restaurant' | 'network' */
    this.code = code
  }
}

const KNOWN = ['not_authenticated', 'invalid_restaurant']

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
