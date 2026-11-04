import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { normalizeMenu } from '@/lib/menu'

export class MenuLoadError extends Error {
  constructor(message, { cause, reason } = {}) {
    super(message, { cause })
    this.name = 'MenuLoadError'
    /** 'not-configured' | 'network' */
    this.reason = reason
  }
}

/**
 * Tải toàn bộ thực đơn (danh mục, quán, món, size, topping) trong hai truy vấn.
 * Dữ liệu chỉ vài chục quán nên tải một lần rồi lọc ở client là đủ nhanh.
 * Khi chạy `npm run dev` mà chưa cấu hình Supabase, dùng dữ liệu mẫu trong repo.
 */
export async function fetchMenu() {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) {
      const { nestedMenuRows } = await import('@/data/menuSeed')
      console.info('[menu] Chưa cấu hình Supabase, dùng dữ liệu mẫu trong repo (chỉ khi dev).')
      return normalizeMenu(nestedMenuRows())
    }
    throw new MenuLoadError('Website chưa được cấu hình kết nối dữ liệu.', {
      reason: 'not-configured',
    })
  }

  const [categories, restaurants] = await Promise.all([
    supabase.from('categories').select('id, slug, name, icon, sort_order'),
    supabase.from('restaurants').select(
      `id, slug, name, description, image_url, address, category_id, rating, rating_count,
         delivery_time_min, open_time, close_time, is_featured,
         foods (
           id, restaurant_id, category_id, name, description, image_url, base_price, calories,
           tags, stock, has_spice, is_featured, is_available, sort_order,
           food_sizes ( id, name, price_delta, is_default, sort_order ),
           food_toppings ( id, name, price, sort_order )
         )`,
    ),
  ])

  const failed = categories.error ?? restaurants.error
  if (failed) {
    throw new MenuLoadError('Không tải được thực đơn. Vui lòng thử lại.', {
      cause: failed,
      reason: 'network',
    })
  }

  return normalizeMenu({ categories: categories.data, restaurants: restaurants.data })
}
