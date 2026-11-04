<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { useCheckout } from '@/composables/useCheckout'
import { useCartStore } from '@/stores/cart'
import CartLineItem from '@/components/CartLineItem.vue'
import CartSummary from '@/components/CartSummary.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'

const { isLoading, isError, errorMessage, canRetry, retry } = useMenu()
const cart = useCartStore()
const checkout = useCheckout()
const confirmClear = ref(false)

function clearCart() {
  cart.clear()
  confirmClear.value = false
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold sm:text-3xl">Giỏ hàng</h1>

    <EmptyState
      v-if="cart.isEmpty"
      icon="🛒"
      title="Giỏ hàng đang trống"
      message="Chọn vài món ngon rồi quay lại đây nhé."
    >
      <RouterLink
        :to="{ name: 'restaurants' }"
        class="rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
      >
        Xem danh sách quán
      </RouterLink>
    </EmptyState>

    <ErrorState
      v-else-if="isError"
      title="Không tải được giỏ hàng"
      :message="errorMessage"
      :retryable="canRetry"
      @retry="retry"
    />

    <div v-else-if="isLoading" class="space-y-3" aria-busy="true">
      <div v-for="n in 2" :key="n" class="h-24 animate-pulse rounded-2xl bg-stone-200" />
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-3 lg:items-start">
      <section
        class="rounded-2xl border border-stone-200 bg-white px-4 sm:px-6 lg:col-span-2"
        aria-labelledby="cart-restaurant"
      >
        <header class="flex items-center justify-between gap-3 border-b border-stone-200 py-4">
          <h2 id="cart-restaurant" class="font-semibold">
            <span class="mr-1 text-stone-500">Đặt từ</span>
            <RouterLink
              v-if="cart.restaurant"
              :to="{ name: 'restaurant-detail', params: { id: cart.restaurant.id } }"
              class="text-brand-700 hover:underline"
            >
              {{ cart.restaurant.name }}
            </RouterLink>
          </h2>
          <button
            type="button"
            class="text-sm font-medium text-red-700 hover:underline"
            @click="confirmClear = true"
          >
            Xóa giỏ
          </button>
        </header>
        <ul class="divide-y divide-stone-200">
          <CartLineItem v-for="line in cart.lines" :key="line.key" :line="line" />
        </ul>
        <div class="border-t border-stone-200 py-4">
          <RouterLink
            v-if="cart.restaurant"
            :to="{ name: 'restaurant-detail', params: { id: cart.restaurant.id } }"
            class="text-sm font-medium text-brand-700 hover:underline"
          >
            + Thêm món khác của quán
          </RouterLink>
        </div>
      </section>

      <aside
        class="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 lg:sticky lg:top-24"
        aria-label="Tóm tắt đơn hàng"
      >
        <CartSummary @checkout="checkout" />
      </aside>
    </div>

    <ConfirmDialog
      :open="confirmClear"
      title="Xóa toàn bộ giỏ hàng?"
      message="Tất cả món trong giỏ sẽ bị xóa."
      confirm-label="Xóa giỏ"
      danger
      @confirm="clearCart"
      @cancel="confirmClear = false"
    />
  </div>
</template>
