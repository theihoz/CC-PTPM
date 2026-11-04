<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SmartImage from './SmartImage.vue'
import { isOpenAt } from '@/lib/menu'

const props = defineProps({
  restaurant: { type: Object, required: true },
  category: { type: Object, default: null },
  /** Tên món khớp từ khóa tìm kiếm, hiển thị thêm dưới tên quán. */
  matchedFoods: { type: Array, default: () => [] },
  now: { type: Date, default: () => new Date() },
})

const open = computed(() => isOpenAt(props.restaurant, props.now))
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="relative aspect-[4/3] overflow-hidden">
      <SmartImage
        :src="restaurant.imageUrl"
        :alt="`Ảnh quán ${restaurant.name}`"
        :width="480"
        :fallback-icon="category?.icon ?? '🍽️'"
        class="transition duration-300 group-hover:scale-105"
      />
      <span
        class="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="open ? 'bg-emerald-700 text-white' : 'bg-stone-800/80 text-white'"
      >
        {{ open ? 'Đang mở cửa' : 'Đã đóng cửa' }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-1.5 p-4">
      <h3 class="text-base leading-snug font-semibold">
        <RouterLink
          :to="{ name: 'restaurant-detail', params: { id: restaurant.id } }"
          class="after:absolute after:inset-0 focus-visible:outline-none"
        >
          {{ restaurant.name }}
        </RouterLink>
      </h3>
      <p v-if="matchedFoods.length" class="text-sm text-brand-700">
        Có món: {{ matchedFoods.join(', ') }}
      </p>
      <p v-else class="line-clamp-2 text-sm text-stone-600">{{ restaurant.description }}</p>
      <dl class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-sm text-stone-600">
        <div class="flex items-center gap-1">
          <dt class="sr-only">Đánh giá</dt>
          <dd>
            <span aria-hidden="true" class="text-amber-500">★</span>
            <span class="font-medium text-stone-900">{{ restaurant.rating.toFixed(1) }}</span>
            <span class="text-stone-500"
              >({{ restaurant.ratingCount.toLocaleString('vi-VN') }})</span
            >
          </dd>
        </div>
        <div>
          <dt class="sr-only">Thời gian giao</dt>
          <dd>{{ restaurant.deliveryTimeMin }} phút</dd>
        </div>
        <div v-if="category">
          <dt class="sr-only">Danh mục</dt>
          <dd>{{ category.icon }} {{ category.name }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
