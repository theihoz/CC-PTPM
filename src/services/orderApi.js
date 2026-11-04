// Gọi RPC đặt hàng và đọc đơn. Store chỉ dùng qua module này để test thay được.
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export class OrderError extends Error {
  constructor(code, { shortages = [], cause } = {}) {
    super(code, { cause })
    this.name = 'OrderError'
    this.code = code
    /** [{ foodId, name, requested, available }] khi code = 'out_of_stock' */
    this.shortages = shortages
  }
}

function client() {
  if (!isSupabaseConfigured) throw new OrderError('network')
  return supabase
}

function parseDetails(details) {
  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

/**
 * Đặt đơn. Chỉ gửi lựa chọn (không có giá) và thông tin giao hàng.
 * @returns {{ id: string, code: string, total: number }}
 */
export async function placeOrder(items, delivery) {
  const { data, error } = await client().rpc('place_order', { items, delivery })
  if (error) {
    const known = [
      'not_authenticated',
      'empty_cart',
      'invalid_item',
      'mixed_restaurants',
      'invalid_delivery',
      'below_minimum',
      'out_of_stock',
    ]
    const code = known.includes(error.message) ? error.message : 'network'
    const shortages = code === 'out_of_stock' ? (parseDetails(error.details) ?? []) : []
    throw new OrderError(code, { shortages, cause: error })
  }
  return data
}

const ORDER_COLUMNS = `id, code, restaurant_id, recipient_name, phone, address, note, payment_method,
  subtotal, shipping_fee, total, created_at, cancelled_at,
  restaurants ( id, name ),
  order_items ( id, food_id, food_name, image_url, size_name, toppings, spice_level,
                unit_price, quantity, line_total )`

/** Một đơn của người đang đăng nhập (RLS chặn đơn của người khác); null nếu không có. */
export async function fetchOrder(orderId) {
  const { data, error } = await client()
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .order('id', { referencedTable: 'order_items' })
    .maybeSingle()
  if (error) throw new OrderError('network', { cause: error })
  return data
}
