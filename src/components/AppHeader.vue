<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import CartDrawer from './CartDrawer.vue'

const cart = useCartStore()
const cartOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
    <nav
      class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4"
      aria-label="Điều hướng chính"
    >
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold text-brand-600">
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <span class="hidden min-[380px]:inline">FoodieGo</span>
      </RouterLink>
      <div class="flex items-center gap-1 text-sm font-medium sm:gap-3">
        <RouterLink
          to="/"
          class="rounded-lg px-2 py-2 hover:bg-stone-100 sm:px-3"
          active-class="text-brand-600"
          exact-active-class="text-brand-600"
        >
          Trang chủ
        </RouterLink>
        <RouterLink
          :to="{ name: 'restaurants' }"
          class="rounded-lg px-2 py-2 hover:bg-stone-100 sm:px-3"
          active-class="text-brand-600"
        >
          Quán ăn
        </RouterLink>
        <button
          type="button"
          class="relative rounded-lg p-2 text-xl hover:bg-stone-100"
          :aria-label="`Mở giỏ hàng, ${cart.itemCount} món`"
          aria-haspopup="dialog"
          @click="cartOpen = true"
        >
          <span aria-hidden="true">🛒</span>
          <span
            v-if="cart.itemCount"
            class="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-xs leading-5 font-semibold text-white"
            aria-hidden="true"
          >
            {{ cart.itemCount > 99 ? '99+' : cart.itemCount }}
          </span>
        </button>
      </div>
    </nav>
  </header>
  <CartDrawer v-model:open="cartOpen" />
</template>
