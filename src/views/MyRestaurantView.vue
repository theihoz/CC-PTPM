<script setup>
import { computed, onMounted, reactive, ref, useId, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { useMyRestaurantStore } from '@/stores/myRestaurant'
import { useToastStore } from '@/stores/toast'
import {
  isValid,
  RESTAURANT_DESCRIPTION_MAX,
  validateImageUrl,
  validateRestaurant,
} from '@/lib/validation'
import TextField from '@/components/TextField.vue'
import SmartImage from '@/components/SmartImage.vue'
import ErrorState from '@/components/ErrorState.vue'
import OwnerFoodList from '@/components/OwnerFoodList.vue'

const owner = useMyRestaurantStore()
const toast = useToastStore()
const { menu } = useMenu()

const ids = { description: useId(), category: useId(), isOpen: useId() }

const blank = () => ({
  name: '',
  description: '',
  imageUrl: '',
  address: '',
  categoryId: '',
  openTime: '07:00',
  closeTime: '22:00',
  deliveryTimeMin: '30',
  isOpen: true,
})
const form = reactive(blank())
const errors = reactive({})
const submitted = ref(false)

const isNew = computed(() => !owner.restaurant)
const categoryIds = computed(() => menu.categories.map((c) => c.id))
const previewUrl = computed(() =>
  form.imageUrl && !validateImageUrl(form.imageUrl) ? form.imageUrl.trim() : '',
)

watch(
  () => owner.restaurant,
  (restaurant) => {
    Object.assign(
      form,
      restaurant
        ? {
            name: restaurant.name,
            description: restaurant.description,
            imageUrl: restaurant.imageUrl,
            address: restaurant.address,
            categoryId: String(restaurant.categoryId ?? ''),
            openTime: restaurant.openTime,
            closeTime: restaurant.closeTime,
            deliveryTimeMin: String(restaurant.deliveryTimeMin),
            isOpen: restaurant.isOpen,
          }
        : blank(),
    )
  },
  { immediate: true },
)

// Sau lần bấm Lưu đầu tiên, lỗi được cập nhật ngay khi người dùng sửa.
watch(form, () => {
  if (submitted.value) Object.assign(errors, validateRestaurant(form, categoryIds.value))
})

onMounted(() => owner.load())

async function save() {
  submitted.value = true
  Object.assign(errors, validateRestaurant(form, categoryIds.value))
  if (!isValid(errors)) return
  const result = await owner.save(form)
  if (result.ok) {
    toast.show(
      result.created ? 'Đã đăng ký quán. Quán đã hiện cho khách.' : 'Đã lưu thông tin quán.',
      { tone: 'success' },
    )
  } else if (result.message) {
    toast.show(result.message, { tone: 'error' })
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ isNew ? 'Đăng ký quán' : 'Quán của tôi' }}</h1>
        <p class="mt-1 text-sm text-stone-600">
          {{
            isNew
              ? 'Mở quán trên FoodieGo miễn phí. Quán hiện cho khách ngay sau khi đăng ký.'
              : 'Sửa thông tin quán và bật/tắt Tạm đóng.'
          }}
        </p>
      </div>
      <RouterLink
        v-if="owner.restaurant"
        :to="{ name: 'restaurant-detail', params: { id: owner.restaurant.id } }"
        class="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100"
      >
        Xem trang quán
      </RouterLink>
    </header>

    <ErrorState
      v-if="owner.status === 'error'"
      title="Không tải được thông tin quán"
      :message="owner.error"
      retryable
      @retry="owner.load()"
    />

    <div
      v-else-if="owner.status !== 'ready'"
      class="h-96 animate-pulse rounded-3xl bg-stone-200"
      aria-busy="true"
    />

    <form
      v-else
      class="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
      novalidate
      @submit.prevent="save"
    >
      <TextField v-model="form.name" label="Tên quán" required :error="errors.name" />

      <div class="space-y-1.5">
        <label :for="ids.description" class="block text-sm font-medium">Mô tả</label>
        <textarea
          :id="ids.description"
          v-model="form.description"
          rows="3"
          :maxlength="RESTAURANT_DESCRIPTION_MAX"
          class="w-full rounded-xl border bg-white px-4 py-2.5 focus-visible:border-brand-600"
          :class="errors.description ? 'border-red-400' : 'border-stone-300'"
        />
        <p class="text-xs text-stone-500">
          {{ form.description.length }}/{{ RESTAURANT_DESCRIPTION_MAX }} ký tự
        </p>
      </div>

      <TextField
        v-model="form.imageUrl"
        label="Ảnh quán (đường dẫn)"
        type="url"
        inputmode="url"
        hint="Dán đường dẫn ảnh bắt đầu bằng https://. Để trống sẽ dùng biểu tượng danh mục."
        :error="errors.imageUrl"
      />
      <div v-if="previewUrl" class="h-40 overflow-hidden rounded-2xl border border-stone-200">
        <SmartImage :src="previewUrl" alt="Xem trước ảnh quán" :width="800" :height="320" />
      </div>

      <TextField
        v-model="form.address"
        label="Địa chỉ quán"
        required
        autocomplete="street-address"
        :error="errors.address"
      />

      <div class="space-y-1.5">
        <label :for="ids.category" class="block text-sm font-medium">
          Danh mục<span class="text-red-600" aria-hidden="true"> *</span>
        </label>
        <select
          :id="ids.category"
          v-model="form.categoryId"
          required
          :aria-invalid="errors.categoryId ? 'true' : undefined"
          class="w-full rounded-xl border bg-white px-4 py-2.5 focus-visible:border-brand-600"
          :class="errors.categoryId ? 'border-red-400' : 'border-stone-300'"
        >
          <option value="" disabled>Chọn danh mục</option>
          <option
            v-for="category in menu.categories"
            :key="category.id"
            :value="String(category.id)"
          >
            {{ category.icon }} {{ category.name }}
          </option>
        </select>
        <p v-if="errors.categoryId" class="text-sm text-red-700">{{ errors.categoryId }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <TextField
          v-model="form.openTime"
          label="Giờ mở cửa"
          type="time"
          required
          :error="errors.openTime"
        />
        <TextField
          v-model="form.closeTime"
          label="Giờ đóng cửa"
          type="time"
          required
          :error="errors.closeTime"
        />
        <TextField
          v-model="form.deliveryTimeMin"
          label="Thời gian giao (phút)"
          type="number"
          inputmode="numeric"
          required
          :error="errors.deliveryTimeMin"
        />
      </div>

      <div
        v-if="!isNew"
        class="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"
      >
        <input
          :id="ids.isOpen"
          v-model="form.isOpen"
          type="checkbox"
          class="mt-1 size-5 accent-brand-600"
        />
        <label :for="ids.isOpen" class="text-sm">
          <span class="font-medium">Đang mở bán</span>
          <span class="block text-stone-600">
            Bỏ chọn để Tạm đóng: quán ẩn khỏi danh sách và gợi ý AI, khách không đặt được đơn mới.
          </span>
        </label>
      </div>

      <button
        type="submit"
        :disabled="owner.saving"
        class="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {{ owner.saving ? 'Đang lưu…' : isNew ? 'Đăng ký quán' : 'Lưu thông tin quán' }}
      </button>
    </form>

    <OwnerFoodList v-if="owner.status === 'ready' && owner.restaurant" />
  </section>
</template>
