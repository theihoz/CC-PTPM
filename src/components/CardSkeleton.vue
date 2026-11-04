<script setup>
defineProps({
  count: { type: Number, default: 3 },
  square: { type: Boolean, default: false },
})
</script>

<template>
  <div
    v-for="n in count"
    :key="n"
    class="animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white"
    aria-hidden="true"
  >
    <div :class="square ? 'aspect-square' : 'aspect-[4/3]'" class="bg-stone-200" />
    <div class="space-y-2 p-4">
      <div class="h-4 w-3/4 rounded bg-stone-200" />
      <div class="h-3 w-1/2 rounded bg-stone-200" />
    </div>
  </div>
</template>
