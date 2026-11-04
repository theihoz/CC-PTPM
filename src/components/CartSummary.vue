<script setup>
import { computed } from 'vue'
import { formatVND } from '@/lib/format'
import { FREE_SHIPPING_THRESHOLD, MIN_ORDER_SUBTOTAL } from '@/lib/constants'
import { useCartStore } from '@/stores/cart'

defineEmits(['checkout'])

const cart = useCartStore()
const toFreeShipping = computed(() => Math.max(0, FREE_SHIPPING_THRESHOLD - cart.subtotal))
const progress = computed(() => Math.min(100, (cart.subtotal / FREE_SHIPPING_THRESHOLD) * 100))
</script>

<template>
  <div class="space-y-4">
    <dl class="space-y-2 text-sm">
      <div class="flex justify-between">
        <dt class="text-stone-600">Tạm tính ({{ cart.itemCount }} món)</dt>
        <dd>{{ formatVND(cart.subtotal) }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-stone-600">Phí giao hàng</dt>
        <dd>
          <span v-if="cart.shippingFee === 0" class="font-medium text-emerald-700">Miễn phí</span>
          <span v-else>{{ formatVND(cart.shippingFee) }}</span>
        </dd>
      </div>
      <div class="flex justify-between border-t border-stone-200 pt-3 text-base">
        <dt class="font-semibold">Tổng cộng</dt>
        <dd class="text-xl font-bold text-brand-700">{{ formatVND(cart.total) }}</dd>
      </div>
    </dl>

    <div v-if="toFreeShipping > 0" class="space-y-1.5">
      <p class="text-xs text-stone-600">
        Thêm <strong>{{ formatVND(toFreeShipping) }}</strong> để được miễn phí giao hàng
      </p>
      <div
        class="h-1.5 overflow-hidden rounded-full bg-stone-200"
        role="progressbar"
        :aria-valuenow="Math.round(progress)"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Tiến độ miễn phí giao hàng"
      >
        <div
          class="h-full rounded-full bg-emerald-500 transition-all"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <p
      v-if="!cart.meetsMinimum"
      class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      Đơn tối thiểu {{ formatVND(MIN_ORDER_SUBTOTAL) }}. Bạn cần thêm
      <strong>{{ formatVND(cart.amountToMinimum) }}</strong> để đặt hàng.
    </p>

    <button
      type="button"
      class="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
      :disabled="!cart.meetsMinimum"
      @click="$emit('checkout')"
    >
      Đặt hàng
    </button>
  </div>
</template>
