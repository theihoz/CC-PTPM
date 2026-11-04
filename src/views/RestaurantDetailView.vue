<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { usePageTitle } from '@/composables/usePageTitle'
import { isOpenAt } from '@/lib/menu'
import SmartImage from '@/components/SmartImage.vue'
import FoodCard from '@/components/FoodCard.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'
import ErrorState from '@/components/ErrorState.vue'
import NotFoundView from './NotFoundView.vue'

const props = defineProps({
  id: { type: String, required: true },
})

const { menu, isLoading, isError, errorMessage, canRetry, retry } = useMenu()

const restaurant = computed(() => menu.restaurantById(props.id))
const category = computed(() =>
  restaurant.value ? menu.categoryById(restaurant.value.categoryId) : null,
)
const open = computed(() => (restaurant.value ? isOpenAt(restaurant.value) : false))

// Thực đơn chia nhóm theo danh mục, đúng thứ tự danh mục; món không có danh mục xếp cuối.
const groups = computed(() => {
  if (!restaurant.value) return []
  const result = menu.categories
    .map((c) => ({
      key: c.slug,
      title: c.name,
      icon: c.icon,
      foods: restaurant.value.foods.filter((f) => f.categoryId === c.id),
    }))
    .filter((g) => g.foods.length > 0)
  const others = restaurant.value.foods.filter((f) => !menu.categoryById(f.categoryId))
  if (others.length) result.push({ key: 'khac', title: 'Món khác', icon: '🍽️', foods: others })
  return result
})

usePageTitle(
  () => restaurant.value?.name,
  () =>
    restaurant.value
      ? `${restaurant.value.name}: ${restaurant.value.description} Địa chỉ ${restaurant.value.address}. Đặt món giao tận nơi trên FoodieGo.`
      : '',
)
</script>

<template>
  <ErrorState
    v-if="isError"
    title="Không tải được thông tin quán"
    :message="errorMessage"
    :retryable="canRetry"
    @retry="retry"
  />

  <div v-else-if="isLoading" class="space-y-6" aria-busy="true">
    <div class="h-56 animate-pulse rounded-3xl bg-stone-200 sm:h-72" />
    <div class="h-8 w-1/2 animate-pulse rounded bg-stone-200" />
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <CardSkeleton :count="4" square />
    </div>
  </div>

  <NotFoundView
    v-else-if="!restaurant"
    title="Không tìm thấy quán"
    message="Quán này không tồn tại hoặc đã ngừng hoạt động."
  />

  <article v-else class="space-y-8">
    <nav aria-label="Đường dẫn" class="text-sm text-stone-500">
      <ol class="flex flex-wrap items-center gap-1">
        <li>
          <RouterLink :to="{ name: 'restaurants' }" class="hover:underline">Quán ăn</RouterLink>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" class="text-stone-900">{{ restaurant.name }}</li>
      </ol>
    </nav>

    <header class="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div class="relative h-56 sm:h-72">
        <SmartImage
          :src="restaurant.imageUrl"
          :alt="`Ảnh quán ${restaurant.name}`"
          :width="1200"
          :height="480"
          :fallback-icon="category?.icon ?? '🍽️'"
          eager
        />
        <span
          class="absolute top-4 left-4 rounded-full px-3 py-1 text-sm font-semibold"
          :class="open ? 'bg-emerald-700 text-white' : 'bg-stone-800/80 text-white'"
        >
          {{ open ? 'Đang mở cửa' : 'Đã đóng cửa' }}
        </span>
      </div>
      <div class="space-y-3 p-5 sm:p-6">
        <h1 class="text-2xl font-bold sm:text-3xl">{{ restaurant.name }}</h1>
        <p class="text-stone-600">{{ restaurant.description }}</p>
        <dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div class="flex gap-2">
            <dt class="text-stone-500">Đánh giá</dt>
            <dd>
              <span aria-hidden="true" class="text-amber-500">★</span>
              <strong>{{ restaurant.rating.toFixed(1) }}</strong>
              <span class="text-stone-500">
                ({{ restaurant.ratingCount.toLocaleString('vi-VN') }} lượt)
              </span>
            </dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-stone-500">Giờ mở cửa</dt>
            <dd>{{ restaurant.openTime }} – {{ restaurant.closeTime }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-stone-500">Địa chỉ</dt>
            <dd>{{ restaurant.address }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="text-stone-500">Giao hàng</dt>
            <dd>khoảng {{ restaurant.deliveryTimeMin }} phút</dd>
          </div>
        </dl>
      </div>
    </header>

    <nav
      v-if="groups.length > 1"
      aria-label="Nhóm món trong thực đơn"
      class="sticky top-16 z-30 -mx-4 overflow-x-auto bg-stone-50/95 px-4 py-2 backdrop-blur"
    >
      <ul class="flex w-max gap-2">
        <li v-for="group in groups" :key="group.key">
          <a
            :href="`#nhom-${group.key}`"
            class="block rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium whitespace-nowrap hover:border-brand-500"
          >
            <span aria-hidden="true">{{ group.icon }}</span> {{ group.title }}
            <span class="text-stone-500">({{ group.foods.length }})</span>
          </a>
        </li>
      </ul>
    </nav>

    <section
      v-for="group in groups"
      :id="`nhom-${group.key}`"
      :key="group.key"
      :aria-labelledby="`tieu-de-${group.key}`"
      class="scroll-mt-32"
    >
      <h2 :id="`tieu-de-${group.key}`" class="text-xl font-bold">
        <span aria-hidden="true">{{ group.icon }}</span> {{ group.title }}
      </h2>
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <FoodCard v-for="food in group.foods" :key="food.id" :food="food" />
      </div>
    </section>

    <p v-if="groups.length === 0" class="text-stone-600">Quán chưa có món nào trong thực đơn.</p>
  </article>
</template>
