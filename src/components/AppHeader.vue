<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
    <nav
      class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4"
      aria-label="Điều hướng chính"
    >
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold text-brand-600">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        FoodieGo
      </RouterLink>
      <div class="flex items-center gap-1 text-sm font-medium sm:gap-3">
        <RouterLink
          to="/"
          class="rounded-lg px-3 py-2 hover:bg-stone-100"
          active-class="text-brand-600"
          exact-active-class="text-brand-600"
        >
          Trang chủ
        </RouterLink>
      </div>
    </nav>
  </header>
</template>
