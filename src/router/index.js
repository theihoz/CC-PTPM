import { createRouter, createWebHistory } from 'vue-router'
import { APP_NAME } from '@/lib/constants'
import { safeRedirect } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'

export { APP_NAME }

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Trang chủ' },
  },
  {
    path: '/restaurants',
    name: 'restaurants',
    component: () => import('@/views/RestaurantsView.vue'),
    meta: { title: 'Quán ăn' },
  },
  {
    path: '/restaurants/:id(\\d+)',
    name: 'restaurant-detail',
    component: () => import('@/views/RestaurantDetailView.vue'),
    props: true,
    meta: { title: 'Chi tiết quán' },
  },
  {
    path: '/restaurants/:id(\\d+)/foods/:foodId(\\d+)',
    name: 'food-detail',
    component: () => import('@/views/FoodDetailView.vue'),
    props: true,
    meta: { title: 'Chi tiết món' },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: { title: 'Giỏ hàng' },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: { title: 'Đặt hàng', requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: { title: 'Đơn hàng của tôi', requiresAuth: true },
  },
  {
    path: '/orders/:orderId',
    name: 'order-detail',
    component: () => import('@/views/OrderDetailView.vue'),
    props: true,
    meta: { title: 'Đơn hàng', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Đăng nhập', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: 'Đăng ký', guestOnly: true },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/AccountView.vue'),
    meta: { title: 'Tài khoản', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Không tìm thấy trang' },
  },
]

export function pageTitle(route) {
  return route.meta?.title ? `${route.meta.title} · ${APP_NAME}` : APP_NAME
}

/**
 * Guard toàn cục:
 * - route có `meta.requiresAuth` mà chưa đăng nhập → /login?redirect=<đường dẫn cũ>
 * - route có `meta.guestOnly` (đăng nhập, đăng ký) mà đã đăng nhập → về redirect hoặc trang chủ
 */
export function installAuthGuard(router) {
  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth && !to.meta.guestOnly) return true
    const auth = useAuthStore()
    await auth.ready()
    if (to.meta.requiresAuth && !auth.isSignedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.guestOnly && auth.isSignedIn) {
      return safeRedirect(to.query.redirect)
    }
    return true
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Chỉ đổi query (lọc, tìm kiếm) thì giữ nguyên vị trí cuộn.
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

installAuthGuard(router)

router.afterEach((to) => {
  document.title = pageTitle(to)
})

export default router
