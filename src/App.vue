<script setup>
import AppHeader from '@/components/AppHeader.vue'
import ToastHost from '@/components/ToastHost.vue'
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
  >
    Bỏ qua đến nội dung chính
  </a>
  <div class="flex min-h-dvh flex-col">
    <AppHeader />
    <main id="main" class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <RouterView />
    </main>
    <footer class="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
      © {{ new Date().getFullYear() }} FoodieGo · Đồ án Vue 3
    </footer>
  </div>
  <ToastHost />
</template>
