<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  title: { type: String, default: 'Không tìm thấy trang' },
  message: { type: String, default: 'Trang bạn tìm không tồn tại hoặc đã bị di chuyển.' },
})
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center py-16 text-center">
    <p class="text-6xl font-bold text-brand-600">404</p>
    <h1 class="mt-4 text-2xl font-semibold">{{ title }}</h1>
    <p class="mt-2 text-stone-600">{{ message }}</p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <RouterLink
        to="/"
        class="rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
      >
        Về trang chủ
      </RouterLink>
      <RouterLink
        :to="{ name: 'restaurants' }"
        class="rounded-xl border border-stone-300 bg-white px-5 py-2.5 font-medium hover:border-brand-500"
      >
        Xem danh sách quán
      </RouterLink>
    </div>
  </section>
</template>
