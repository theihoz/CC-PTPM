import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi'
import { authErrorMessage } from '@/lib/authErrors'
import { normalizePhone } from '@/lib/validation'

/**
 * Phiên đăng nhập và hồ sơ người dùng.
 * Các hành động trả về `{ ok: true }` hoặc `{ ok: false, error: '<thông báo tiếng Việt>' }`.
 * Thành phần khác (giỏ hàng) nghe đăng nhập/đăng xuất qua `onSignedIn` / `onSignedOut`.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)
  /** 'idle' | 'loading' | 'ready' */
  const status = ref('idle')
  let initPromise = null
  let unsubscribe = null

  const user = computed(() => session.value?.user ?? null)
  const isSignedIn = computed(() => Boolean(user.value))
  const displayName = computed(
    () =>
      profile.value?.full_name || user.value?.user_metadata?.full_name || user.value?.email || '',
  )

  // ── Tín hiệu cho phần khác của app ──────────────────────────────────────
  const signedInHandlers = new Set()
  const signedOutHandlers = new Set()

  /** Gọi callback(user) mỗi khi có người đăng nhập. Trả về hàm hủy. */
  function onSignedIn(callback) {
    signedInHandlers.add(callback)
    return () => signedInHandlers.delete(callback)
  }

  /** Gọi callback() mỗi khi đăng xuất. Trả về hàm hủy. */
  function onSignedOut(callback) {
    signedOutHandlers.add(callback)
    return () => signedOutHandlers.delete(callback)
  }

  async function loadProfile() {
    if (!user.value) {
      profile.value = null
      return
    }
    try {
      profile.value = await authApi.fetchProfile(user.value.id)
    } catch (err) {
      console.error('[auth] Không tải được hồ sơ', err)
    }
  }

  async function applySession(next) {
    const previousId = user.value?.id ?? null
    session.value = next
    const nextId = next?.user?.id ?? null
    if (nextId === previousId) return
    if (nextId) {
      await loadProfile()
      for (const handler of signedInHandlers) await handler(next.user)
    } else {
      profile.value = null
      for (const handler of signedOutHandlers) await handler()
    }
  }

  /** Khôi phục phiên đã lưu (giữ đăng nhập khi tải lại trang) và theo dõi thay đổi. */
  function init() {
    if (initPromise) return initPromise
    status.value = 'loading'
    initPromise = (async () => {
      try {
        session.value = await authApi.getSession()
        if (session.value) await loadProfile()
      } catch (err) {
        console.error('[auth] Không khôi phục được phiên', err)
        session.value = null
      }
      unsubscribe = authApi.onAuthStateChange((event, next) => {
        // Supabase gọi lại ngay cả khi chỉ làm mới token; applySession chỉ phát tín hiệu khi đổi người.
        if (event !== 'INITIAL_SESSION') applySession(next)
      })
      status.value = 'ready'
    })()
    return initPromise
  }

  /** Chờ đến khi biết chắc có đăng nhập hay không (dùng trong route guard). */
  function ready() {
    return init()
  }

  async function run(action) {
    try {
      await action()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) }
    }
  }

  function signUp({ email, password, fullName, phone }) {
    return run(async () => {
      const data = await authApi.signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: normalizePhone(phone),
      })
      // Nếu project còn bật xác nhận email thì chưa có phiên.
      if (!data.session) {
        throw Object.assign(new Error('confirm'), { code: 'email_not_confirmed' })
      }
      await applySession(data.session)
    })
  }

  function signIn({ email, password }) {
    return run(async () => {
      const data = await authApi.signIn({ email: email.trim(), password })
      await applySession(data.session)
    })
  }

  function signOut() {
    return run(async () => {
      try {
        await authApi.signOut()
      } finally {
        // Dù máy chủ lỗi, phía trình duyệt vẫn đăng xuất.
        await applySession(null)
      }
    })
  }

  function updateProfile(patch) {
    return run(async () => {
      if (!user.value) throw Object.assign(new Error('no session'), { code: 'session_expired' })
      profile.value = await authApi.updateProfile(user.value.id, patch)
    })
  }

  function dispose() {
    unsubscribe?.()
  }

  return {
    session,
    profile,
    status,
    user,
    isSignedIn,
    displayName,
    init,
    ready,
    signUp,
    signIn,
    signOut,
    loadProfile,
    updateProfile,
    onSignedIn,
    onSignedOut,
    dispose,
  }
})
