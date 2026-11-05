import { createRouter, createWebHistory } from 'vue-router'
import { APP_NAME } from '@/lib/constants'
import { safeRedirect } from '@/lib/validation'
import { setPageHead } from '@/lib/head'
import { useAuthStore } from '@/stores/auth'

export { APP_NAME }

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'Trang chủ',
      description:
        'Đặt món ăn trực tuyến, giao tận nơi. Xem quán nổi bật, món được yêu thích và để AI gợi ý thực đơn.',
    },
  },
  {
    path: '/restaurants',
    name: 'restaurants',
    component: () => import('@/views/RestaurantsView.vue'),
    meta: {
      title: 'Quán ăn',
      description:
        'Tìm quán ăn theo tên hoặc món, lọc theo danh mục và sắp xếp theo đánh giá, thời gian giao.',
    },
  },
  {
    path: '/restaurants/:id(\\d+)',
    name: 'restaurant-detail',
    component: () => import('@/views/RestaurantDetailView.vue'),
    props: true,
    meta: {
      title: 'Chi tiết quán',
      description: 'Thông tin quán, giờ mở cửa và thực đơn đầy đủ.',
    },
  },
  {
    path: '/restaurants/:id(\\d+)/foods/:foodId(\\d+)',
    name: 'food-detail',
    component: () => import('@/views/FoodDetailView.vue'),
    props: true,
    meta: {
      title: 'Chi tiết món',
      description: 'Chọn size, topping, độ cay và đặt món.',
    },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/views/CartView.vue'),
    meta: {
      title: 'Giỏ hàng',
      description: 'Giỏ hàng của bạn: sửa số lượng, xem phí giao hàng và tổng tiền.',
    },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/views/CheckoutView.vue'),
    meta: {
      title: 'Đặt hàng',
      description: 'Xác nhận thông tin giao hàng và đặt đơn, thanh toán khi nhận hàng.',
      requiresAuth: true,
    },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/views/OrdersView.vue'),
    meta: {
      title: 'Đơn hàng của tôi',
      description: 'Lịch sử đơn hàng và trạng thái giao hàng.',
      requiresAuth: true,
    },
  },
  {
    path: '/orders/:orderId',
    name: 'order-detail',
    component: () => import('@/views/OrderDetailView.vue'),
    props: true,
    meta: {
      title: 'Đơn hàng',
      description: 'Theo dõi trạng thái đơn hàng theo thời gian thực.',
      requiresAuth: true,
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      title: 'Đăng nhập',
      description: 'Đăng nhập để đặt món và theo dõi đơn hàng.',
      guestOnly: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: {
      title: 'Đăng ký',
      description: 'Tạo tài khoản FoodieGo để đặt món và lưu giỏ hàng.',
      guestOnly: true,
    },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/views/AccountView.vue'),
    meta: {
      title: 'Tài khoản',
      description: 'Thông tin tài khoản và địa chỉ giao hàng mặc định.',
      requiresAuth: true,
    },
  },
  {
    path: '/my-restaurant',
    name: 'my-restaurant',
    component: () => import('@/views/MyRestaurantView.vue'),
    meta: {
      title: 'Quán của tôi',
      description: 'Đăng ký quán trên FoodieGo, sửa thông tin quán và bật/tắt Tạm đóng.',
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Không tìm thấy trang',
      description: 'Trang bạn tìm không tồn tại.',
    },
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
  setPageHead({ title: to.meta?.title, description: to.meta?.description })
})

export default router
