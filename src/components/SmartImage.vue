<script setup>
import { computed, ref, watch } from 'vue'
import { sizedImage } from '@/lib/image'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, required: true },
  width: { type: Number, default: 480 },
  height: { type: Number, default: undefined },
  eager: { type: Boolean, default: false },
  fallbackIcon: { type: String, default: '🍽️' },
})

const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)

const resolved = computed(() => sizedImage(props.src, props.width, props.height))
</script>

<template>
  <img
    v-if="resolved && !failed"
    :src="resolved"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
    class="h-full w-full object-cover"
    @error="failed = true"
  />
  <div
    v-else
    role="img"
    :aria-label="alt"
    class="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-4xl"
  >
    {{ fallbackIcon }}
  </div>
</template>
