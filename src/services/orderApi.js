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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Một đơn của người đang đăng nhập (RLS chặn đơn của người khác); null nếu không có. */
export async function fetchOrder(orderId) {
  if (!UUID.test(orderId)) return null
  const { data, error } = await client()
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .order('id', { referencedTable: 'order_items' })
    .maybeSingle()
  if (error) throw new OrderError('network', { cause: error })
  return data
}

/** Mọi đơn của người đang đăng nhập, mới nhất trước. */
export async function fetchOrders() {
  const { data, error } = await client()
    .from('orders')
    .select(
      `id, code, total, created_at, cancelled_at,
       restaurants ( id, name, image_url ),
       order_items ( quantity )`,
    )
    .order('created_at', { ascending: false })
  if (error) throw new OrderError('network', { cause: error })
  return data.map((order) => ({
    ...order,
    itemCount: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
  }))
}
