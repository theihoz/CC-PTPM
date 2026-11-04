// Nối giỏ hàng với đăng nhập:
// - Mở app khi đã đăng nhập → dùng giỏ tài khoản (Supabase).
// - Đăng nhập → gộp giỏ trên máy vào giỏ tài khoản, rồi xóa giỏ trên máy.
// - Đăng xuất → xóa giỏ trên máy; giỏ tài khoản vẫn nằm trên máy chủ.

const EMPTY = { restaurantId: null, items: [] }

/**
 * @param auth  auth store (init, user, onSignedIn, onSignedOut)
 * @param cart  cart store
 * @param guestRepo         repository cho khách vãng lai (LocalStorage)
 * @param accountRepoFor    (user) => repository giỏ của tài khoản
 */
export async function setupCartSync({ auth, cart, guestRepo, accountRepoFor }) {
  // Hiện giỏ khách ngay để header có số lượng, không chờ khôi phục phiên.
  await cart.useRepository(guestRepo)
  await auth.init()

  if (auth.user) {
    // Đã đăng nhập từ trước: giỏ khách (nếu có, ví dụ thêm món ở tab khác) gộp vào tài khoản.
    await cart.mergeOnLogin(accountRepoFor(auth.user))
    guestRepo.save(EMPTY)
  }

  auth.onSignedIn(async (user) => {
    await cart.mergeOnLogin(accountRepoFor(user))
    guestRepo.save(EMPTY)
  })

  auth.onSignedOut(async () => {
    guestRepo.save(EMPTY)
    await cart.switchToGuest(guestRepo)
  })
}
