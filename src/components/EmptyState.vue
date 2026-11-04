<script setup>
defineProps({
  icon: { type: String, default: '🔍' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
})
</script>

<template>
  <div
    class="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"
  >
    <p class="text-4xl" aria-hidden="true">{{ icon }}</p>
    <p class="mt-3 font-semibold">{{ title }}</p>
    <p v-if="message" class="mt-1 text-sm text-stone-600">{{ message }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
