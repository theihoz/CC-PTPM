<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useMenuStore } from '@/stores/menu'
import { useToastStore } from '@/stores/toast'

// Đăng nhập khi giỏ trên máy và giỏ của tài khoản thuộc hai quán khác nhau:
// mỗi đơn chỉ một quán nên khách phải chọn giữ một giỏ.
const cart = useCartStore()
const menu = useMenuStore()
const toast = useToastStore()
const dialog = ref(null)

const conflict = computed(() => cart.pendingConflict)
const count = (state) => state.items.reduce((sum, item) => sum + item.quantity, 0)
const options = computed(() => {
  if (!conflict.value) return []
  const { local, remote } = conflict.value
  return [
    {
      choice: 'remote',
      title: 'Giỏ đã lưu trong tài khoản',
      restaurant: menu.restaurantById(remote.restaurantId)?.name ?? 'Quán khác',
      quantity: count(remote),
    },
    {
      choice: 'local',
      title: 'Giỏ vừa chọn trên máy này',
      restaurant: menu.restaurantById(local.restaurantId)?.name ?? 'Quán khác',
      quantity: count(local),
    },
  ]
})

watch(conflict, async (value) => {
  await nextTick()
  const el = dialog.value
  if (!el) return
  if (value && !el.open) el.showModal ? el.showModal() : el.setAttribute('open', '')
  if (!value && el.open) el.close ? el.close() : el.removeAttribute('open')
})

function choose(option) {
  cart.resolveConflict(option.choice)
  toast.show(`Đã giữ giỏ hàng của ${option.restaurant}.`)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(30rem,calc(100%-2rem))] rounded-2xl p-0 shadow-xl backdrop:bg-stone-900/50"
    aria-labelledby="cart-conflict-title"
    @cancel.prevent="choose(options[0])"
  >
    <div v-if="conflict" class="space-y-4 p-6">
      <h2 id="cart-conflict-title" class="text-lg font-semibold">Bạn muốn giữ giỏ hàng nào?</h2>
      <p class="text-stone-600">
        Tài khoản của bạn đã có giỏ hàng ở quán khác. Mỗi đơn chỉ đặt từ một quán, nên bạn hãy chọn
        giữ một giỏ. Giỏ còn lại sẽ bị xóa.
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="option in options"
          :key="option.choice"
          type="button"
          class="rounded-2xl border border-stone-300 p-4 text-left hover:border-brand-600 hover:bg-brand-50"
          @click="choose(option)"
        >
          <span class="block text-xs font-medium tracking-wide text-stone-500 uppercase">
            {{ option.title }}
          </span>
          <span class="mt-1 block font-semibold">{{ option.restaurant }}</span>
          <span class="text-sm text-stone-600">{{ option.quantity }} món</span>
        </button>
      </div>
    </div>
  </dialog>
</template>
