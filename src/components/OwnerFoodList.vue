<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMyRestaurantStore } from '@/stores/myRestaurant'
import { useToastStore } from '@/stores/toast'
import { formatVND } from '@/lib/format'
import { stockStatus } from '@/lib/menu'
import SmartImage from './SmartImage.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import EmptyState from './EmptyState.vue'

const owner = useMyRestaurantStore()
const toast = useToastStore()
const pendingDelete = ref(null)

onMounted(() => owner.loadFoods())

async function confirmDelete() {
  const food = pendingDelete.value
  pendingDelete.value = null
  if (!food) return
  const result = await owner.deleteFood(food.id)
  toast.show(result.ok ? `Đã xóa món ${food.name}.` : result.message, {
    tone: result.ok ? 'success' : 'error',
  })
}
</script>

<template>
  <section class="space-y-4" aria-labelledby="owner-menu-title">
    <header class="flex items-center justify-between gap-4">
      <h2 id="owner-menu-title" class="text-xl font-bold">Thực đơn</h2>
      <RouterLink
        :to="{ name: 'my-food-new' }"
        class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        + Thêm món
      </RouterLink>
    </header>

    <div
      v-if="owner.foodsStatus === 'loading' || owner.foodsStatus === 'idle'"
      class="h-40 animate-pulse rounded-3xl bg-stone-200"
      aria-busy="true"
    />

    <p v-else-if="owner.foodsStatus === 'error'" class="text-sm text-red-700">
      {{ owner.error }}
      <button type="button" class="font-medium underline" @click="owner.loadFoods()">
        Thử lại
      </button>
    </p>

    <EmptyState
      v-else-if="!owner.foods.length"
      icon="🍽️"
      title="Quán chưa có món nào"
      message="Thêm món đầu tiên để khách đặt được."
    />

    <ul
      v-else
      class="divide-y divide-stone-200 overflow-hidden rounded-3xl border border-stone-200 bg-white"
    >
      <li v-for="food in owner.foods" :key="food.id" class="flex items-center gap-4 p-4">
        <div class="size-16 shrink-0 overflow-hidden rounded-xl">
          <SmartImage :src="food.imageUrl" :alt="food.name" :width="128" :height="128" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold">{{ food.name }}</p>
          <p class="text-sm text-stone-600">
            {{ formatVND(food.basePrice) }} · còn {{ food.stock }} phần
          </p>
          <p class="mt-1 flex flex-wrap gap-1 text-xs font-medium">
            <span v-if="!food.isAvailable" class="rounded-full bg-stone-200 px-2 py-0.5">
              Ngừng bán
            </span>
            <span
              v-else-if="stockStatus(food.stock) === 'out'"
              class="rounded-full bg-stone-800 px-2 py-0.5 text-white"
            >
              Hết món
            </span>
            <span v-else class="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
              Đang bán
            </span>
          </p>
        </div>
        <div class="flex shrink-0 flex-col gap-2 sm:flex-row">
          <RouterLink
            :to="{ name: 'my-food-edit', params: { foodId: food.id } }"
            class="rounded-lg border border-stone-300 px-3 py-1.5 text-center text-sm font-medium hover:bg-stone-100"
            :aria-label="`Sửa món ${food.name}`"
          >
            Sửa
          </RouterLink>
          <button
            type="button"
            class="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            :aria-label="`Xóa món ${food.name}`"
            @click="pendingDelete = food"
          >
            Xóa
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="Boolean(pendingDelete)"
      title="Xóa món này?"
      :message="
        pendingDelete
          ? `Món ${pendingDelete.name} sẽ bị xóa hẳn khỏi thực đơn và khỏi giỏ hàng của khách. Đơn hàng cũ vẫn giữ nguyên. Nếu chỉ muốn tạm ẩn, hãy sửa món và bỏ chọn Đang bán.`
          : ''
      "
      confirm-label="Xóa món"
      cancel-label="Giữ lại"
      danger
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>
