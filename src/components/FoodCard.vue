<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SmartImage from './SmartImage.vue'
import { formatVND } from '@/lib/format'
import { stockStatus } from '@/lib/menu'

const props = defineProps({
  food: { type: Object, required: true },
  restaurant: { type: Object, default: null },
})

const stock = computed(() => stockStatus(props.food.stock))
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
  >
    <div class="relative aspect-square overflow-hidden">
      <SmartImage
        :src="food.imageUrl"
        :alt="food.name"
        :width="400"
        :height="400"
        :class="['transition duration-300 group-hover:scale-105', stock === 'out' && 'grayscale']"
      />
      <span
        v-if="stock === 'out'"
        class="absolute top-3 left-3 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-semibold text-white"
      >
        Hết món
      </span>
      <span
        v-else-if="stock === 'low'"
        class="absolute top-3 left-3 rounded-full bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white"
      >
        Sắp hết
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-3">
      <h3 class="line-clamp-2 text-sm leading-snug font-semibold">
        <RouterLink
          :to="{
            name: 'food-detail',
            params: { id: food.restaurantId, foodId: food.id },
          }"
          class="after:absolute after:inset-0 focus-visible:outline-none"
        >
          {{ food.name }}
        </RouterLink>
      </h3>
      <p v-if="restaurant" class="truncate text-xs text-stone-500">{{ restaurant.name }}</p>
      <div class="mt-auto flex items-end justify-between gap-2 pt-1">
        <p class="font-semibold text-brand-700">{{ formatVND(food.basePrice) }}</p>
        <p class="text-xs text-stone-500">{{ food.calories }} kcal</p>
      </div>
    </div>
  </article>
</template>
