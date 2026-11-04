<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import SmartImage from './SmartImage.vue'
import QuantityStepper from './QuantityStepper.vue'
import { formatVND } from '@/lib/format'
import { describeOptions } from '@/lib/cart'
import { useCartStore } from '@/stores/cart'
import { useToastStore } from '@/stores/toast'

const props = defineProps({
  line: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['navigate'])

const cart = useCartStore()
const toast = useToastStore()

const options = computed(() => describeOptions(props.line))
// Tối đa = số đang có + phần tồn kho chưa nằm trong giỏ.
const max = computed(() => props.line.quantity + cart.remainingStock(props.line.foodId))

function setQuantity(quantity) {
  const result = cart.updateQuantity(props.line.key, quantity)
  if (result.status === 'stock')
    toast.show('Đã đạt số lượng tối đa còn trong kho.', { tone: 'error' })
}
</script>

<template>
  <li class="flex gap-3 py-4" :class="compact ? 'text-sm' : ''">
    <RouterLink
      :to="{ name: 'food-detail', params: { id: line.food.restaurantId, foodId: line.food.id } }"
      class="shrink-0 overflow-hidden rounded-xl"
      :class="compact ? 'size-16' : 'size-20 sm:size-24'"
      tabindex="-1"
      aria-hidden="true"
      @click="emit('navigate')"
    >
      <SmartImage :src="line.food.imageUrl" :alt="line.food.name" :width="200" :height="200" />
    </RouterLink>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <RouterLink
            :to="{
              name: 'food-detail',
              params: { id: line.food.restaurantId, foodId: line.food.id },
            }"
            class="font-semibold hover:underline"
            @click="emit('navigate')"
          >
            {{ line.food.name }}
          </RouterLink>
          <p v-if="options" class="text-stone-500" :class="compact ? 'text-xs' : 'text-sm'">
            {{ options }}
          </p>
        </div>
        <p class="shrink-0 font-semibold">{{ formatVND(line.lineTotal) }}</p>
      </div>
      <div class="mt-auto flex items-center justify-between gap-3">
        <QuantityStepper
          :model-value="line.quantity"
          :max="max"
          :label="line.food.name"
          @update:model-value="setQuantity"
        />
        <span class="text-xs text-stone-500">{{ formatVND(line.unitPrice) }} / phần</span>
      </div>
    </div>
  </li>
</template>
