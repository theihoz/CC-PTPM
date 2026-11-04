import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/services/authApi', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
}))

const authApi = await import('@/services/authApi')
const { useAuthStore } = await import('@/stores/auth')
const { routes, installAuthGuard } = await import('@/router')

const user = { id: 'u1', email: 'an@vd.com', user_metadata: { full_name: 'Nguyễn Văn An' } }
const session = { user, access_token: 't' }
const profile = { id: 'u1', full_name: 'Nguyễn Văn An', phone: '0901234567', default_address: '' }

let authListener
let auth

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  authApi.getSession.mockResolvedValue(null)
  authApi.onAuthStateChange.mockImplementation((cb) => {
    authListener = cb
    return () => {}
  })
  authApi.fetchProfile.mockResolvedValue(profile)
  auth = useAuthStore()
})

describe('khôi phục phiên', () => {
  it('chưa đăng nhập', async () => {
    await auth.init()
    expect(auth.status).toBe('ready')
    expect(auth.isSignedIn).toBe(false)
  })

  it('giữ đăng nhập khi tải lại trang và nạp hồ sơ', async () => {
    authApi.getSession.mockResolvedValue(session)
    await auth.init()
    expect(auth.isSignedIn).toBe(true)
    expect(auth.profile).toEqual(profile)
    expect(auth.displayName).toBe('Nguyễn Văn An')
  })

  it('init gọi nhiều lần chỉ chạy một lần', async () => {
    await Promise.all([auth.init(), auth.ready(), auth.init()])
    expect(authApi.getSession).toHaveBeenCalledTimes(1)
  })
})

describe('đăng nhập, đăng ký, đăng xuất', () => {
  it('đăng nhập thành công phát tín hiệu cho phần khác của app', async () => {
    await auth.init()
    const signedIn = vi.fn()
    auth.onSignedIn(signedIn)
    authApi.signIn.mockResolvedValue({ session })

    expect(await auth.signIn({ email: ' an@vd.com ', password: 'matkhau123' })).toEqual({
      ok: true,
    })
    expect(authApi.signIn).toHaveBeenCalledWith({ email: 'an@vd.com', password: 'matkhau123' })
    expect(auth.isSignedIn).toBe(true)
    expect(signedIn).toHaveBeenCalledWith(user)
  })

  it('sai mật khẩu trả về thông báo tiếng Việt', async () => {
    authApi.signIn.mockRejectedValue({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    })
    expect(await auth.signIn({ email: 'an@vd.com', password: 'sai' })).toEqual({
      ok: false,
      error: 'Email hoặc mật khẩu không đúng.',
    })
    expect(auth.isSignedIn).toBe(false)
  })

  it('đăng ký gửi họ tên và số điện thoại đã chuẩn hóa, rồi đăng nhập luôn', async () => {
    authApi.signUp.mockResolvedValue({ user, session })
    const result = await auth.signUp({
      email: 'an@vd.com',
      password: 'matkhau123',
      fullName: '  Nguyễn Văn An ',
      phone: '090 123 4567',
    })
    expect(result.ok).toBe(true)
    expect(authApi.signUp).toHaveBeenCalledWith({
      email: 'an@vd.com',
      password: 'matkhau123',
      fullName: 'Nguyễn Văn An',
      phone: '0901234567',
    })
    expect(auth.isSignedIn).toBe(true)
  })

  it('email đã tồn tại báo lỗi tiếng Việt', async () => {
    authApi.signUp.mockRejectedValue({ code: 'user_already_exists' })
    const result = await auth.signUp({ email: 'a@b.cd', password: 'x', fullName: 'An', phone: '' })
    expect(result.error).toContain('đã được đăng ký')
  })

  it('project còn bật xác nhận email thì báo cần xác nhận', async () => {
    authApi.signUp.mockResolvedValue({ user, session: null })
    const result = await auth.signUp({ email: 'a@b.cd', password: 'x', fullName: 'An', phone: '' })
    expect(result).toMatchObject({ ok: false })
    expect(result.error).toContain('xác nhận email')
  })

  it('đăng xuất xóa phiên, hồ sơ và phát tín hiệu, kể cả khi máy chủ lỗi', async () => {
    authApi.getSession.mockResolvedValue(session)
    await auth.init()
    const signedOut = vi.fn()
    auth.onSignedOut(signedOut)
    authApi.signOut.mockRejectedValue(new Error('Failed to fetch'))

    await auth.signOut()
    expect(auth.isSignedIn).toBe(false)
    expect(auth.profile).toBeNull()
    expect(signedOut).toHaveBeenCalledTimes(1)
  })

  it('làm mới token cùng người dùng không phát lại tín hiệu đăng nhập', async () => {
    authApi.getSession.mockResolvedValue(session)
    await auth.init()
    const signedIn = vi.fn()
    auth.onSignedIn(signedIn)
    await authListener('TOKEN_REFRESHED', { ...session, access_token: 't2' })
    expect(signedIn).not.toHaveBeenCalled()
    expect(auth.session.access_token).toBe('t2')
  })

  it('cập nhật hồ sơ', async () => {
    authApi.getSession.mockResolvedValue(session)
    await auth.init()
    authApi.updateProfile.mockResolvedValue({ ...profile, default_address: '12 Lê Lợi' })
    expect((await auth.updateProfile({ default_address: '12 Lê Lợi' })).ok).toBe(true)
    expect(authApi.updateProfile).toHaveBeenCalledWith('u1', { default_address: '12 Lê Lợi' })
    expect(auth.profile.default_address).toBe('12 Lê Lợi')
  })
})

describe('route guard', () => {
  async function routerAt(path) {
    const router = createRouter({ history: createMemoryHistory(), routes })
    installAuthGuard(router)
    await router.push(path)
    return router.currentRoute.value
  }

  it('trang cần đăng nhập chuyển sang /login kèm redirect', async () => {
    const route = await routerAt('/account?tab=1')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/account?tab=1')
  })

  it('đã đăng nhập thì vào được trang cần đăng nhập', async () => {
    authApi.getSession.mockResolvedValue(session)
    expect((await routerAt('/account')).name).toBe('account')
  })

  it('đã đăng nhập mà mở /login thì về trang redirect', async () => {
    authApi.getSession.mockResolvedValue(session)
    expect((await routerAt('/login?redirect=/cart')).fullPath).toBe('/cart')
    expect((await routerAt('/register')).fullPath).toBe('/')
  })

  it('trang công khai không cần chờ đăng nhập', async () => {
    expect((await routerAt('/restaurants')).name).toBe('restaurants')
    expect(authApi.getSession).not.toHaveBeenCalled()
  })
})
