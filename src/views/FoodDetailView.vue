<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { usePageTitle } from '@/composables/usePageTitle'
import { formatVND } from '@/lib/format'
import { stockStatus } from '@/lib/menu'
import { tagLabel } from '@/lib/tags'
import SmartImage from '@/components/SmartImage.vue'
import FoodOptions from '@/components/FoodOptions.vue'
import ErrorState from '@/components/ErrorState.vue'
import NotFoundView from './NotFoundView.vue'

const props = defineProps({
  id: { type: String, required: true },
  foodId: { type: String, required: true },
})

const { menu, isLoading, isError, errorMessage, canRetry, retry } = useMenu()

const restaurant = computed(() => menu.restaurantById(props.id))
// Món phải thuộc đúng quán trên URL, nếu không thì coi như không tồn tại.
const food = computed(() => {
  const found = menu.foodById(props.foodId)
  return found && found.restaurantId === restaurant.value?.id ? found : null
})
const stock = computed(() => (food.value ? stockStatus(food.value.stock) : 'out'))

// Giỏ hàng (ticket #6) sẽ trừ phần đã có trong giỏ khỏi con số này.
const available = computed(() => food.value?.stock ?? 0)

const notice = ref('')
function onAdd() {
  notice.value = 'Giỏ hàng đang được hoàn thiện, bạn sẽ thêm được món trong bản cập nhật tới.'
}

usePageTitle(() => food.value?.name)
</script>

<template>
  <ErrorState
    v-if="isError"
    title="Không tải được thông tin món"
    :message="errorMessage"
    :retryable="canRetry"
    @retry="retry"
  />

  <div v-else-if="isLoading" class="grid gap-8 md:grid-cols-2" aria-busy="true">
    <div class="aspect-square animate-pulse rounded-3xl bg-stone-200" />
    <div class="space-y-4">
      <div class="h-8 w-2/3 animate-pulse rounded bg-stone-200" />
      <div class="h-4 w-1/3 animate-pulse rounded bg-stone-200" />
      <div class="h-24 animate-pulse rounded bg-stone-200" />
    </div>
  </div>

  <NotFoundView
    v-else-if="!food"
    title="Không tìm thấy món"
    message="Món này không tồn tại hoặc không thuộc quán bạn đang xem."
  />

  <article v-else class="space-y-6">
    <nav aria-label="Đường dẫn" class="text-sm text-stone-500">
      <ol class="flex flex-wrap items-center gap-1">
        <li>
          <RouterLink :to="{ name: 'restaurants' }" class="hover:underline">Quán ăn</RouterLink>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <RouterLink
            :to="{ name: 'restaurant-detail', params: { id: restaurant.id } }"
            class="hover:underline"
          >
            {{ restaurant.name }}
          </RouterLink>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" class="text-stone-900">{{ food.name }}</li>
      </ol>
    </nav>

    <div class="grid gap-8 md:grid-cols-2 md:items-start">
      <div class="relative overflow-hidden rounded-3xl md:sticky md:top-24">
        <div class="aspect-square">
          <SmartImage
            :src="food.imageUrl"
            :alt="food.name"
            :width="800"
            :height="800"
            eager
            :class="stock === 'out' && 'grayscale'"
          />
        </div>
        <span
          v-if="stock === 'out'"
          class="absolute top-4 left-4 rounded-full bg-stone-800 px-3 py-1 text-sm font-semibold text-white"
        >
          Hết món
        </span>
        <span
          v-else-if="stock === 'low'"
          class="absolute top-4 left-4 rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white"
        >
          Sắp hết · còn {{ food.stock }}
        </span>
      </div>

      <div class="space-y-6">
        <header class="space-y-3">
          <h1 class="text-2xl font-bold sm:text-3xl">{{ food.name }}</h1>
          <p class="text-sm">
            <RouterLink
              :to="{ name: 'restaurant-detail', params: { id: restaurant.id } }"
              class="font-medium text-brand-700 hover:underline"
            >
              {{ restaurant.name }}
            </RouterLink>
          </p>
          <p class="text-stone-600">{{ food.description }}</p>
          <ul v-if="food.tags.length" class="flex flex-wrap gap-2" aria-label="Đặc điểm món">
            <li
              v-for="tag in food.tags"
              :key="tag"
              class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
            >
              <span aria-hidden="true">{{ tagLabel(tag).icon }}</span> {{ tagLabel(tag).label }}
            </li>
          </ul>
          <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div class="flex gap-2">
              <dt class="text-stone-500">Giá gốc</dt>
              <dd class="font-semibold">{{ formatVND(food.basePrice) }}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="text-stone-500">Năng lượng</dt>
              <dd class="font-semibold">{{ food.calories }} kcal</dd>
            </div>
          </dl>
        </header>

        <FoodOptions :food="food" :available="available" @add="onAdd" />

        <p
          v-if="notice"
          role="status"
          class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {{ notice }}
        </p>
      </div>
    </div>
  </article>
</template>
