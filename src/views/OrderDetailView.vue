<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchOrder } from '@/services/orderApi'
import { formatVND } from '@/lib/format'
import { SPICE_LABELS } from '@/lib/pricing'
import { orderStatus } from '@/lib/orderStatus'
import { useNow } from '@/composables/useNow'
import { usePageTitle } from '@/composables/usePageTitle'
import ErrorState from '@/components/ErrorState.vue'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import OrderTracker from '@/components/OrderTracker.vue'
import NotFoundView from './NotFoundView.vue'

// Theo dõi một đơn. Trạng thái tính lại mỗi giây từ created_at, nên trang tự
// chuyển bước mà không cần tải lại, và tải lại trang vẫn ra đúng trạng thái.
const props = defineProps({
  orderId: { type: String, required: true },
})

const route = useRoute()
const justPlaced = computed(() => route.query.new === '1')
const now = useNow(1000)

const order = ref(null)
const status = ref('loading') // 'loading' | 'ready' | 'not-found' | 'error'

async function load() {
  status.value = 'loading'
  try {
    order.value = await fetchOrder(props.orderId)
    status.value = order.value ? 'ready' : 'not-found'
  } catch {
    status.value = 'error'
  }
}
watch(() => props.orderId, load, { immediate: true })

const optionsOf = (item) =>
  [
    item.size_name,
    item.toppings.map((t) => t.name).join(', '),
    item.spice_level ? SPICE_LABELS[item.spice_level] : '',
  ]
    .filter(Boolean)
    .join(' · ')

const placedAt = (iso) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))

const tracking = computed(() => (order.value ? orderStatus(order.value, now.value) : null))

usePageTitle(() => (order.value ? `Đơn ${order.value.code}` : ''))
</script>

<template>
  <div
    v-if="status === 'loading'"
    class="h-64 animate-pulse rounded-2xl bg-stone-200"
    aria-busy="true"
  />

  <ErrorState v-else-if="status === 'error'" title="Không tải được đơn hàng" @retry="load" />

  <NotFoundView
    v-else-if="status === 'not-found'"
    title="Không tìm thấy đơn hàng"
    message="Đơn này không tồn tại hoặc không thuộc tài khoản của bạn."
  />

  <article v-else class="mx-auto max-w-2xl space-y-6">
    <nav aria-label="Đường dẫn" class="text-sm text-stone-500">
      <ol class="flex flex-wrap items-center gap-1">
        <li>
          <RouterLink :to="{ name: 'orders' }" class="hover:underline">Đơn hàng của tôi</RouterLink>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" class="text-stone-900">{{ order.code }}</li>
      </ol>
    </nav>

    <p
      v-if="justPlaced"
      class="rounded-2xl bg-emerald-50 px-5 py-3 text-center font-medium text-emerald-900"
    >
      🎉 Đặt hàng thành công! Quán đã nhận đơn của bạn.
    </p>

    <section
      class="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
      aria-labelledby="order-heading"
    >
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="order-heading" class="text-xl font-bold sm:text-2xl">Đơn {{ order.code }}</h1>
          <p class="text-sm text-stone-600">Đặt lúc {{ placedAt(order.created_at) }}</p>
        </div>
        <OrderStatusBadge :status="tracking.status" />
      </header>
      <OrderTracker :state="tracking" />
    </section>

    <section
      class="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"
      aria-labelledby="items-heading"
    >
      <h2 id="items-heading" class="font-semibold">
        Món đã đặt từ
        <RouterLink
          :to="{ name: 'restaurant-detail', params: { id: order.restaurant_id } }"
          class="text-brand-700 hover:underline"
        >
          {{ order.restaurants?.name }}
        </RouterLink>
      </h2>
      <ul class="mt-3 divide-y divide-stone-200 text-sm">
        <li
          v-for="item in order.order_items"
          :key="item.id"
          class="flex justify-between gap-3 py-2.5"
        >
          <div>
            <p class="font-medium">{{ item.quantity }} × {{ item.food_name }}</p>
            <p v-if="optionsOf(item)" class="text-xs text-stone-500">{{ optionsOf(item) }}</p>
          </div>
          <p class="shrink-0">{{ formatVND(item.line_total) }}</p>
        </li>
      </ul>
      <dl class="mt-3 space-y-1.5 border-t border-stone-200 pt-3 text-sm">
        <div class="flex justify-between">
          <dt class="text-stone-600">Tạm tính</dt>
          <dd>{{ formatVND(order.subtotal) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-stone-600">Phí giao hàng</dt>
          <dd>{{ order.shipping_fee ? formatVND(order.shipping_fee) : 'Miễn phí' }}</dd>
        </div>
        <div class="flex justify-between text-base">
          <dt class="font-semibold">Tổng cộng (COD)</dt>
          <dd class="font-bold text-brand-700">{{ formatVND(order.total) }}</dd>
        </div>
      </dl>
    </section>

    <section
      class="rounded-2xl border border-stone-200 bg-white p-5 text-sm sm:p-6"
      aria-labelledby="delivery-heading"
    >
      <h2 id="delivery-heading" class="font-semibold">Giao đến</h2>
      <p class="mt-2">{{ order.recipient_name }} · {{ order.phone }}</p>
      <p class="text-stone-600">{{ order.address }}</p>
      <p v-if="order.note" class="mt-1 text-stone-600">Ghi chú: {{ order.note }}</p>
    </section>

    <div class="text-center">
      <RouterLink
        :to="{ name: 'restaurants' }"
        class="inline-block rounded-xl border border-stone-300 bg-white px-5 py-2.5 font-medium hover:border-brand-500"
      >
        Tiếp tục đặt món
      </RouterLink>
    </div>
  </article>
</template>
