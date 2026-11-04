<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { SORT_OPTIONS, matchingFoodNames, normalizeSort } from '@/lib/menu'
import RestaurantCard from '@/components/RestaurantCard.vue'
import CardSkeleton from '@/components/CardSkeleton.vue'
import ErrorState from '@/components/ErrorState.vue'
import EmptyState from '@/components/EmptyState.vue'

const SEARCH_DEBOUNCE_MS = 250

const route = useRoute()
const router = useRouter()
const { menu, isLoading, isError, errorMessage, canRetry, retry } = useMenu()

const firstString = (value) => (Array.isArray(value) ? value[0] : value) ?? ''

// Bộ lọc nằm trên URL để tải lại trang hoặc chia sẻ link vẫn giữ kết quả.
const q = computed(() => firstString(route.query.q))
const category = computed(() => firstString(route.query.category))
const sort = computed(() => normalizeSort(firstString(route.query.sort)))

function withQuery(patch) {
  const query = { ...route.query, ...patch }
  for (const key of Object.keys(query)) {
    if (query[key] === '' || query[key] == null) delete query[key]
  }
  return { name: 'restaurants', query }
}

// Ô tìm kiếm: gõ đến đâu lọc đến đó, cập nhật URL sau một khoảng nghỉ ngắn.
const keyword = ref(q.value)
let debounceTimer
watch(keyword, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (value.trim() !== q.value) router.replace(withQuery({ q: value.trim() }))
  }, SEARCH_DEBOUNCE_MS)
})
watch(q, (value) => {
  if (value !== keyword.value.trim()) keyword.value = value
})
onBeforeUnmount(() => clearTimeout(debounceTimer))

const sortModel = computed({
  get: () => sort.value,
  set: (value) => router.replace(withQuery({ sort: value === 'rating' ? '' : value })),
})

const activeCategory = computed(() => menu.categories.find((c) => c.slug === category.value))

const results = computed(() =>
  menu.searchRestaurants({ q: q.value, category: category.value, sort: sort.value }),
)

const hasFilters = computed(() => Boolean(q.value || category.value))

const heading = computed(() => {
  if (activeCategory.value) return `Quán ${activeCategory.value.name}`
  return 'Tất cả quán ăn'
})

function clearFilters() {
  keyword.value = ''
  router.replace({
    name: 'restaurants',
    query: sort.value === 'rating' ? {} : { sort: sort.value },
  })
}
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-4">
      <h1 class="text-2xl font-bold sm:text-3xl">{{ heading }}</h1>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1" role="search">
          <label for="restaurant-search" class="sr-only">Tìm theo tên quán hoặc tên món</label>
          <span
            class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            id="restaurant-search"
            v-model="keyword"
            type="search"
            autocomplete="off"
            placeholder="Tìm theo tên quán hoặc tên món…"
            class="w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-4 pl-10 focus-visible:border-brand-600"
          />
        </div>
        <div class="flex items-center gap-2">
          <label for="restaurant-sort" class="text-sm whitespace-nowrap text-stone-600">
            Sắp xếp
          </label>
          <select
            id="restaurant-sort"
            v-model="sortModel"
            class="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
          >
            <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <nav aria-label="Lọc theo danh mục" class="-mx-4 overflow-x-auto px-4">
        <ul class="flex w-max gap-2 pb-1">
          <li>
            <RouterLink
              :to="withQuery({ category: '' })"
              :aria-current="!category ? 'page' : undefined"
              class="block rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition"
              :class="
                !category
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-stone-300 bg-white hover:border-brand-500'
              "
            >
              Tất cả
            </RouterLink>
          </li>
          <li v-for="item in menu.categories" :key="item.id">
            <RouterLink
              :to="withQuery({ category: item.slug })"
              :aria-current="category === item.slug ? 'page' : undefined"
              class="block rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition"
              :class="
                category === item.slug
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-stone-300 bg-white hover:border-brand-500'
              "
            >
              <span aria-hidden="true">{{ item.icon }}</span> {{ item.name }}
            </RouterLink>
          </li>
        </ul>
      </nav>
    </header>

    <ErrorState
      v-if="isError"
      title="Không tải được danh sách quán"
      :message="errorMessage"
      :retryable="canRetry"
      @retry="retry"
    />

    <div v-else-if="isLoading" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <CardSkeleton :count="6" />
    </div>

    <template v-else>
      <p class="text-sm text-stone-600" aria-live="polite">
        Tìm thấy <strong class="text-stone-900">{{ results.length }}</strong> quán
        <template v-if="q">
          cho “<span class="text-stone-900">{{ q }}</span
          >”
        </template>
      </p>

      <EmptyState
        v-if="results.length === 0"
        title="Không tìm thấy quán phù hợp"
        message="Thử từ khóa khác hoặc bỏ bớt bộ lọc."
      >
        <button
          v-if="hasFilters"
          type="button"
          class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          @click="clearFilters"
        >
          Xóa bộ lọc
        </button>
      </EmptyState>

      <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <RestaurantCard
          v-for="restaurant in results"
          :key="restaurant.id"
          :restaurant="restaurant"
          :category="menu.categoryById(restaurant.categoryId)"
          :matched-foods="matchingFoodNames(restaurant, q)"
        />
      </div>
    </template>
  </div>
</template>
