<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center py-16 text-center">
    <p class="text-5xl" aria-hidden="true">🚧</p>
    <h1 class="mt-4 text-2xl font-semibold">Trang đang được xây dựng</h1>
    <p class="mt-2 text-stone-600">Trang chi tiết quán và món sẽ có trong bản cập nhật tới.</p>
    <RouterLink
      :to="{ name: 'restaurants' }"
      class="mt-8 rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
    >
      Xem danh sách quán
    </RouterLink>
  </section>
</template>
