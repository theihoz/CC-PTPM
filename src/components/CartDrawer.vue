<script setup>
import { nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useMenuStore } from '@/stores/menu'
import { useCheckout } from '@/composables/useCheckout'
import CartLineItem from './CartLineItem.vue'
import CartSummary from './CartSummary.vue'

// Xem nhanh giỏ hàng từ header, không rời trang đang xem.
const open = defineModel('open', { type: Boolean, default: false })

const cart = useCartStore()
const menu = useMenuStore()
const route = useRoute()
const checkout = useCheckout()
const dialog = ref(null)

watch(open, async (value) => {
  if (value) menu.load()
  await nextTick()
  const el = dialog.value
  if (!el) return
  if (value && !el.open) el.showModal ? el.showModal() : el.setAttribute('open', '')
  if (!value && el.open) el.close ? el.close() : el.removeAttribute('open')
})

// Chuyển trang thì đóng.
watch(
  () => route.fullPath,
  () => (open.value = false),
)

function onBackdrop(event) {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="ml-auto h-dvh max-h-none w-full max-w-md bg-stone-50 p-0 shadow-2xl backdrop:bg-stone-900/40"
    aria-labelledby="cart-drawer-title"
    @cancel.prevent="open = false"
    @click="onBackdrop"
  >
    <div class="flex h-full flex-col">
      <header
        class="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4"
      >
        <h2 id="cart-drawer-title" class="text-lg font-semibold">
          Giỏ hàng <span class="text-stone-500">({{ cart.itemCount }})</span>
        </h2>
        <button
          type="button"
          class="rounded-lg p-2 hover:bg-stone-100"
          aria-label="Đóng giỏ hàng"
          @click="open = false"
        >
          ✕
        </button>
      </header>

      <div v-if="cart.isEmpty" class="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p class="text-4xl" aria-hidden="true">🛒</p>
        <p class="font-semibold">Giỏ hàng đang trống</p>
        <RouterLink
          :to="{ name: 'restaurants' }"
          class="rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
        >
          Xem danh sách quán
        </RouterLink>
      </div>

      <template v-else>
        <div class="flex-1 overflow-y-auto px-5">
          <p v-if="cart.restaurant" class="pt-4 text-sm text-stone-500">
            Đặt từ <strong class="text-stone-900">{{ cart.restaurant.name }}</strong>
          </p>
          <ul class="divide-y divide-stone-200">
            <CartLineItem v-for="line in cart.lines" :key="line.key" :line="line" compact />
          </ul>
        </div>
        <footer class="space-y-3 border-t border-stone-200 bg-white px-5 py-4">
          <CartSummary @checkout="checkout" />
          <RouterLink
            :to="{ name: 'cart' }"
            class="block text-center text-sm font-medium text-brand-700 hover:underline"
          >
            Xem chi tiết giỏ hàng
          </RouterLink>
        </footer>
      </template>
    </div>
  </dialog>
</template>
