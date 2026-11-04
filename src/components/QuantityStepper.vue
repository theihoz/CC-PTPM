<script setup>
const props = defineProps({
  modelValue: { type: Number, required: true },
  max: { type: Number, required: true },
  label: { type: String, required: true },
  min: { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue'])

function set(value) {
  const next = Math.min(Math.max(value, props.min), props.max)
  if (next !== props.modelValue) emit('update:modelValue', next)
}
</script>

<template>
  <div
    class="inline-flex items-center rounded-xl border border-stone-300 bg-white"
    role="group"
    :aria-label="label"
  >
    <button
      type="button"
      class="size-9 rounded-l-xl text-lg hover:bg-stone-100 disabled:opacity-40"
      :disabled="modelValue <= min"
      :aria-label="modelValue <= 1 ? `Xóa ${label}` : `Giảm số lượng ${label}`"
      @click="set(modelValue - 1)"
    >
      {{ modelValue <= 1 && min === 0 ? '🗑' : '−' }}
    </button>
    <span class="w-9 text-center font-medium tabular-nums" aria-live="polite">{{
      modelValue
    }}</span>
    <button
      type="button"
      class="size-9 rounded-r-xl text-lg hover:bg-stone-100 disabled:opacity-40"
      :disabled="modelValue >= max"
      :aria-label="`Tăng số lượng ${label}`"
      @click="set(modelValue + 1)"
    >
      +
    </button>
  </div>
</template>
