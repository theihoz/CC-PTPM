<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { formatVND } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { useMenu } from '@/composables/useMenu'
import RestaurantCard from '@/components/RestaurantCard.vue'
import FoodCard from '@/components/FoodCard.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'
import ErrorState from '@/components/ErrorState.vue'

const router = useRouter()
const { menu, isLoading, isError, errorMessage, canRetry, retry } = useMenu()

const keyword = ref('')
function search() {
  const q = keyword.value.trim()
  router.push({ name: 'restaurants', query: q ? { q } : {} })
}
</script>

<template>
  <div class="space-y-12">
    <section
      class="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-10 text-white sm:px-12 sm:py-14"
    >
      <h1 class="text-3xl font-bold sm:text-4xl">Đói bụng? Đặt món ngay.</h1>
      <p class="mt-3 max-w-xl text-brand-50">
        Tìm quán ngon quanh bạn, tùy chỉnh món theo ý thích và để AI gợi ý thực đơn phù hợp khẩu vị.
      </p>
      <form class="mt-6 flex max-w-xl gap-2" role="search" @submit.prevent="search">
        <label for="home-search" class="sr-only">Tìm quán hoặc món ăn</label>
        <input
          id="home-search"
          v-model="keyword"
          type="search"
          placeholder="Tìm phở, trà sữa, pizza…"
          class="min-w-0 flex-1 rounded-xl border-0 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus-visible:outline-white"
        />
        <button
          type="submit"
          class="rounded-xl bg-stone-900 px-5 py-3 font-medium text-white hover:bg-stone-800 focus-visible:outline-white"
        >
          Tìm
        </button>
      </form>
      <p class="mt-5 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm">
        Miễn phí giao hàng cho đơn từ {{ formatVND(FREE_SHIPPING_THRESHOLD) }}
      </p>
    </section>

    <ErrorState
      v-if="isError"
      title="Không tải được thực đơn"
      :message="errorMessage"
      :retryable="canRetry"
      @retry="retry"
    />

    <template v-else>
      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" class="text-xl font-bold">Danh mục</h2>
        <ul class="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          <template v-if="isLoading">
            <li v-for="n in 6" :key="n" class="h-24 animate-pulse rounded-2xl bg-stone-200" />
          </template>
          <li v-for="category in menu.categories" v-else :key="category.id">
            <RouterLink
              :to="{ name: 'restaurants', query: { category: category.slug } }"
              class="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-center text-sm font-medium transition hover:border-brand-500 hover:bg-brand-50"
            >
              <span class="text-3xl" aria-hidden="true">{{ category.icon }}</span>
              {{ category.name }}
            </RouterLink>
          </li>
        </ul>
      </section>

      <section aria-labelledby="featured-restaurants-heading">
        <div class="flex items-end justify-between gap-4">
          <h2 id="featured-restaurants-heading" class="text-xl font-bold">Quán nổi bật</h2>
          <RouterLink
            :to="{ name: 'restaurants' }"
            class="text-sm font-medium text-brand-700 hover:underline"
          >
            Xem tất cả quán →
          </RouterLink>
        </div>
        <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton v-if="isLoading" :count="4" />
          <RestaurantCard
            v-for="restaurant in menu.featuredRestaurants"
            v-else
            :key="restaurant.id"
            :restaurant="restaurant"
            :category="menu.categoryById(restaurant.categoryId)"
          />
        </div>
      </section>

      <section aria-labelledby="featured-foods-heading">
        <h2 id="featured-foods-heading" class="text-xl font-bold">Món nổi bật</h2>
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <CardSkeleton v-if="isLoading" :count="5" square />
          <FoodCard
            v-for="food in menu.featuredFoods"
            v-else
            :key="food.id"
            :food="food"
            :restaurant="menu.restaurantById(food.restaurantId)"
          />
        </div>
      </section>
    </template>
  </div>
</template>
