<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useOrdersStore } from '@/stores/orders'
import { useToastStore } from '@/stores/toast'
import { formatVND } from '@/lib/format'
import { describeOptions } from '@/lib/cart'
import { describeShortage } from '@/lib/orderErrors'
import { validateDelivery } from '@/lib/validation'
import TextField from '@/components/TextField.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'

const { isLoading, isError, errorMessage, canRetry, retry } = useMenu()
const auth = useAuthStore()
const cart = useCartStore()
const orders = useOrdersStore()
const toast = useToastStore()
const router = useRouter()

const form = reactive({ recipientName: '', phone: '', address: '', note: '' })
const touched = reactive({})
const submitted = ref(false)
const failure = ref(null) // { message, shortages }

// Tự điền từ hồ sơ; không ghi đè khi khách đã gõ.
watch(
  () => auth.profile,
  (profile) => {
    if (!profile) return
    form.recipientName ||= profile.full_name ?? ''
    form.phone ||= profile.phone ?? ''
    form.address ||= profile.default_address ?? ''
  },
  { immediate: true },
)

const errors = computed(() => validateDelivery(form))
const show = (field) => (touched[field] || submitted.value ? errors.value[field] : '')
const canSubmit = computed(() => cart.meetsMinimum && !orders.placing)

async function submit() {
  submitted.value = true
  failure.value = null
  if (Object.values(errors.value).some(Boolean) || !canSubmit.value) return

  const result = await orders.placeOrder(form)
  if (result.ok) {
    toast.show(`Đặt hàng thành công! Mã đơn ${result.order.code}.`)
    router.replace({ name: 'order-detail', params: { orderId: result.order.id } })
    return
  }
  failure.value = { message: result.message, shortages: result.shortages }
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold sm:text-3xl">Đặt hàng</h1>

    <EmptyState
      v-if="cart.isEmpty"
      icon="🛒"
      title="Giỏ hàng đang trống"
      message="Thêm món vào giỏ trước khi đặt hàng."
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
      title="Không tải được thực đơn"
      :message="errorMessage"
      :retryable="canRetry"
      @retry="retry"
    />

    <div
      v-else-if="isLoading"
      class="h-64 animate-pulse rounded-2xl bg-stone-200"
      aria-busy="true"
    />

    <form
      v-else
      class="grid gap-6 lg:grid-cols-5 lg:items-start"
      novalidate
      @submit.prevent="submit"
    >
      <section
        class="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-span-3"
        aria-labelledby="delivery-heading"
      >
        <h2 id="delivery-heading" class="text-lg font-semibold">Thông tin giao hàng</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <TextField
            v-model="form.recipientName"
            label="Người nhận"
            autocomplete="name"
            required
            :error="show('recipientName')"
            @blur="touched.recipientName = true"
          />
          <TextField
            v-model="form.phone"
            label="Số điện thoại"
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            required
            :error="show('phone')"
            @blur="touched.phone = true"
          />
        </div>
        <TextField
          v-model="form.address"
          label="Địa chỉ giao hàng"
          autocomplete="street-address"
          required
          hint="Số nhà, tên đường, phường/xã, quận/huyện."
          :error="show('address')"
          @blur="touched.address = true"
        />
        <TextField
          v-model="form.note"
          label="Ghi chú cho quán"
          hint="Ví dụ: ít hành, không lấy đũa."
          :error="show('note')"
          @blur="touched.note = true"
        />

        <fieldset class="space-y-2">
          <legend class="mb-2 text-sm font-medium">Thanh toán</legend>
          <label
            class="flex items-center gap-3 rounded-xl border border-brand-600 bg-brand-50 px-4 py-3"
          >
            <input
              type="radio"
              name="payment"
              value="cod"
              checked
              class="size-4 accent-brand-600"
            />
            <span>
              <span class="font-medium">Thanh toán khi nhận hàng (COD)</span>
              <span class="block text-xs text-stone-600"
                >Trả tiền mặt cho shipper khi nhận món.</span
              >
            </span>
          </label>
        </fieldset>
      </section>

      <aside
        class="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 lg:sticky lg:top-24 lg:col-span-2"
        aria-labelledby="review-heading"
      >
        <div class="flex items-baseline justify-between gap-3">
          <h2 id="review-heading" class="text-lg font-semibold">Đơn của bạn</h2>
          <RouterLink
            :to="{ name: 'cart' }"
            class="text-sm font-medium text-brand-700 hover:underline"
          >
            Sửa giỏ
          </RouterLink>
        </div>
        <p v-if="cart.restaurant" class="text-sm text-stone-600">
          Từ <strong class="text-stone-900">{{ cart.restaurant.name }}</strong>
        </p>

        <ul class="divide-y divide-stone-200 text-sm">
          <li v-for="line in cart.lines" :key="line.key" class="flex justify-between gap-3 py-2.5">
            <div class="min-w-0">
              <p class="font-medium">{{ line.quantity }} × {{ line.food.name }}</p>
              <p v-if="describeOptions(line)" class="text-xs text-stone-500">
                {{ describeOptions(line) }}
              </p>
            </div>
            <p class="shrink-0">{{ formatVND(line.lineTotal) }}</p>
          </li>
        </ul>

        <dl class="space-y-1.5 border-t border-stone-200 pt-3 text-sm">
          <div class="flex justify-between">
            <dt class="text-stone-600">Tạm tính</dt>
            <dd>{{ formatVND(cart.subtotal) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-stone-600">Phí giao hàng</dt>
            <dd>{{ cart.shippingFee ? formatVND(cart.shippingFee) : 'Miễn phí' }}</dd>
          </div>
          <div class="flex justify-between pt-1 text-base">
            <dt class="font-semibold">Tổng cộng</dt>
            <dd class="text-xl font-bold text-brand-700">{{ formatVND(cart.total) }}</dd>
          </div>
        </dl>

        <p
          v-if="!cart.meetsMinimum"
          class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          Cần thêm {{ formatVND(cart.amountToMinimum) }} để đạt đơn tối thiểu.
        </p>

        <div
          v-if="failure"
          role="alert"
          class="space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p class="font-medium">{{ failure.message }}</p>
          <ul v-if="failure.shortages.length" class="list-disc pl-5">
            <li v-for="item in failure.shortages" :key="item.foodId">
              {{ describeShortage(item) }}
            </li>
          </ul>
          <RouterLink :to="{ name: 'cart' }" class="inline-block font-semibold underline">
            Quay lại sửa giỏ hàng
          </RouterLink>
        </div>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="w-full rounded-2xl bg-brand-600 py-3.5 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
        >
          {{ orders.placing ? 'Đang đặt hàng…' : `Đặt hàng · ${formatVND(cart.total)}` }}
        </button>
        <p class="text-center text-xs text-stone-500">
          Giá và tồn kho được kiểm tra lại khi đặt hàng.
        </p>
      </aside>
    </form>
  </div>
</template>
