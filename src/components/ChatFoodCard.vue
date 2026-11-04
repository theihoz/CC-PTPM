<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SmartImage from './SmartImage.vue'
import { formatVND } from '@/lib/format'
import { useCartStore } from '@/stores/cart'
import { useMenuStore } from '@/stores/menu'

const props = defineProps({
  food: { type: Object, required: true },
})
const emit = defineEmits(['add', 'navigate'])

const cart = useCartStore()
const menu = useMenuStore()
const restaurant = computed(() => menu.restaurantById(props.food.restaurantId))
const available = computed(() => cart.remainingStock(props.food.id))
</script>

<template>
  <li class="flex gap-3 rounded-xl border border-stone-200 bg-white p-2">
    <div class="size-16 shrink-0 overflow-hidden rounded-lg">
      <SmartImage :src="food.imageUrl" :alt="food.name" :width="160" :height="160" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="truncate text-sm font-semibold">{{ food.name }}</p>
      <p class="truncate text-xs text-stone-500">
        {{ restaurant?.name }} · {{ food.calories }} kcal
      </p>
      <div class="mt-auto flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-brand-700">{{ formatVND(food.basePrice) }}</span>
        <div class="flex gap-1">
          <RouterLink
            :to="{ name: 'food-detail', params: { id: food.restaurantId, foodId: food.id } }"
            class="rounded-lg px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
            @click="emit('navigate')"
          >
            Xem
          </RouterLink>
          <button
            v-if="available > 0"
            type="button"
            class="rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700"
            :aria-label="`Thêm ${food.name} vào giỏ`"
            @click="emit('add', food)"
          >
            + Thêm
          </button>
          <span v-else class="rounded-lg bg-stone-200 px-2 py-1 text-xs text-stone-600"
            >Hết món</span
          >
        </div>
      </div>
    </div>
  </li>
</template>
