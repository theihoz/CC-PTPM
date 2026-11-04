import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true khi đã có đủ VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Client Supabase dùng anon key (công khai, được bảo vệ bằng RLS). null nếu chưa cấu hình. */
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
