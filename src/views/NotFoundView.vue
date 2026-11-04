<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center py-16 text-center">
    <p class="text-6xl font-bold text-brand-600">404</p>
    <h1 class="mt-4 text-2xl font-semibold">Không tìm thấy trang</h1>
    <p class="mt-2 text-stone-600">Trang bạn tìm không tồn tại hoặc đã bị di chuyển.</p>
    <RouterLink
      to="/"
      class="mt-8 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
    >
      Về trang chủ
    </RouterLink>
  </section>
</template>
