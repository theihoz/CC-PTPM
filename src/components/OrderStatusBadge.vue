<script setup>
import { computed } from 'vue'
import { ORDER_STATUS } from '@/lib/orderStatus'

const props = defineProps({
  status: { type: String, required: true },
})

const toneClass = {
  amber: 'bg-amber-100 text-amber-900',
  sky: 'bg-sky-100 text-sky-900',
  emerald: 'bg-emerald-100 text-emerald-900',
  stone: 'bg-stone-200 text-stone-700',
}
const info = computed(() => ORDER_STATUS[props.status])
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
    :class="toneClass[info.tone]"
  >
    <span aria-hidden="true">{{ info.icon }}</span>
    {{ info.label }}
  </span>
</template>
