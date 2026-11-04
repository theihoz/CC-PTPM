<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchOrders } from '@/services/orderApi'
import { formatVND } from '@/lib/format'
import { orderStatus } from '@/lib/orderStatus'
import { useNow } from '@/composables/useNow'
import SmartImage from '@/components/SmartImage.vue'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'

const orders = ref([])
const status = ref('loading') // 'loading' | 'ready' | 'error'
// Trạng thái từng đơn tự đổi theo thời gian, không cần tải lại.
const now = useNow(1000)

async function load() {
  status.value = 'loading'
  try {
    orders.value = await fetchOrders()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}
onMounted(load)

const placedAt = (iso) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h1 class="text-2xl font-bold sm:text-3xl">Đơn hàng của tôi</h1>

    <div v-if="status === 'loading'" class="space-y-3" aria-busy="true">
      <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-2xl bg-stone-200" />
    </div>

    <ErrorState v-else-if="status === 'error'" title="Không tải được đơn hàng" @retry="load" />

    <EmptyState
      v-else-if="orders.length === 0"
      icon="🧾"
      title="Bạn chưa có đơn hàng nào"
      message="Đặt món đầu tiên để theo dõi đơn ở đây."
    >
      <RouterLink
        :to="{ name: 'restaurants' }"
        class="rounded-xl bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
      >
        Xem danh sách quán
      </RouterLink>
    </EmptyState>

    <ul v-else class="space-y-3">
      <li v-for="order in orders" :key="order.id">
        <RouterLink
          :to="{ name: 'order-detail', params: { orderId: order.id } }"
          class="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-brand-500 hover:shadow-sm sm:p-4"
        >
          <div class="size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
            <SmartImage
              :src="order.restaurants?.image_url"
              :alt="`Ảnh quán ${order.restaurants?.name ?? ''}`"
              :width="160"
              :height="160"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-semibold">{{ order.restaurants?.name }}</p>
              <OrderStatusBadge :status="orderStatus(order, now).status" />
            </div>
            <p class="text-sm text-stone-600">
              {{ order.code }} · {{ placedAt(order.created_at) }}
            </p>
            <p class="mt-1 text-sm">
              {{ order.itemCount }} món ·
              <strong class="text-brand-700">{{ formatVND(order.total) }}</strong>
            </p>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
