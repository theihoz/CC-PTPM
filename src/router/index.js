import { createRouter, createWebHistory } from 'vue-router'

export const APP_NAME = 'FoodieGo'

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: 'Trang chủ' },
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
    return savedPosition ?? { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = pageTitle(to)
})

export default router
