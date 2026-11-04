// Lớp mỏng bọc Supabase Auth và bảng profiles. Auth store chỉ gọi qua đây,
// nên test có thể thay toàn bộ module này bằng bản giả.
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

const notConfigured = () =>
  Object.assign(new Error('Supabase chưa được cấu hình'), { code: 'not_configured' })

function client() {
  if (!isSupabaseConfigured) throw notConfigured()
  return supabase
}

export async function getSession() {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Lắng nghe đăng nhập/đăng xuất/làm mới token. Trả về hàm hủy. */
export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session))
  return () => data.subscription.unsubscribe()
}

export async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  })
  if (error) throw error
  // Supabase trả về user không có identity khi email đã tồn tại (để tránh dò email).
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw Object.assign(new Error('User already registered'), { code: 'user_already_exists' })
  }
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchProfile(userId) {
  const { data, error } = await client()
    .from('profiles')
    .select('id, full_name, phone, default_address')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId, patch) {
  const { data, error } = await client()
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('id, full_name, phone, default_address')
    .single()
  if (error) throw error
  return data
}
