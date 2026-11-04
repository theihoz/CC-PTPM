<script setup>
import { computed } from 'vue'
import { ORDER_STATUS, ORDER_STEPS, formatRemaining } from '@/lib/orderStatus'

// Thanh tiến trình giao hàng. `state` là kết quả của orderStatus(order, now).
const props = defineProps({
  state: { type: Object, required: true },
})

const currentIndex = computed(() => ORDER_STEPS.indexOf(props.state.status))
const hint = computed(() => {
  switch (props.state.status) {
    case 'preparing':
      return `Quán đang chuẩn bị món · giao cho shipper ${formatRemaining(props.state.msToNext)}`
    case 'delivering':
      return `Shipper đang trên đường giao · dự kiến đến ${formatRemaining(props.state.msToNext)}`
    case 'delivered':
      return 'Đơn đã giao thành công. Chúc bạn ngon miệng!'
    default:
      return 'Đơn hàng đã bị hủy.'
  }
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="state.status === 'cancelled'" class="rounded-2xl bg-stone-100 p-4 text-center">
      <p class="text-lg font-semibold">✖️ Đơn hàng đã hủy</p>
    </div>

    <template v-else>
      <div
        class="h-2 overflow-hidden rounded-full bg-stone-200"
        role="progressbar"
        aria-label="Tiến trình giao hàng"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.round(state.progress * 100)"
        :aria-valuetext="ORDER_STATUS[state.status].label"
      >
        <div
          class="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-linear"
          :style="{ width: `${state.progress * 100}%` }"
        />
      </div>

      <ol class="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
        <li
          v-for="(step, index) in ORDER_STEPS"
          :key="step"
          class="flex flex-col items-center gap-1"
          :class="index <= currentIndex ? 'text-stone-900' : 'text-stone-500'"
          :aria-current="index === currentIndex ? 'step' : undefined"
        >
          <span
            class="flex size-10 items-center justify-center rounded-full text-lg transition"
            :class="
              index < currentIndex
                ? 'bg-emerald-100'
                : index === currentIndex
                  ? 'bg-brand-100 ring-2 ring-brand-600'
                  : 'bg-stone-100 grayscale'
            "
            aria-hidden="true"
          >
            {{ ORDER_STATUS[step].icon }}
          </span>
          <span class="font-medium">{{ ORDER_STATUS[step].label }}</span>
        </li>
      </ol>
    </template>

    <p class="text-center text-sm text-stone-600" aria-live="polite">{{ hint }}</p>
  </div>
</template>
