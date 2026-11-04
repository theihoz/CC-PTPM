import { createRouter, createWebHistory } from 'vue-router'
import { APP_NAME } from '@/lib/constants'

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
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Không tìm thấy trang' },
  },
]

export function pageTitle(route) {
  return route.meta?.title ? `${route.meta.title} · ${APP_NAME}` : APP_NAME
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

router.afterEach((to) => {
  document.title = pageTitle(to)
})

export default router
