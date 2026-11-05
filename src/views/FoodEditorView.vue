<script setup>
import { computed, onMounted, reactive, ref, useId, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useMenu } from '@/composables/useMenu'
import { useMyRestaurantStore } from '@/stores/myRestaurant'
import { useToastStore } from '@/stores/toast'
import {
  emptyFoodForm,
  FOOD_DESCRIPTION_MAX,
  FOOD_TAGS,
  foodToForm,
  MAX_SIZES,
  MAX_TOPPINGS,
  validateFood,
} from '@/lib/foodForm'
import { isValid, validateImageUrl } from '@/lib/validation'
import { tagLabel } from '@/lib/tags'
import TextField from '@/components/TextField.vue'
import SmartImage from '@/components/SmartImage.vue'
import ErrorState from '@/components/ErrorState.vue'
import NotFoundView from './NotFoundView.vue'

const props = defineProps({
  foodId: { type: String, default: '' },
})

const owner = useMyRestaurantStore()
const toast = useToastStore()
const router = useRouter()
const { menu } = useMenu()

const ids = { description: useId(), category: useId(), sizes: useId(), toppings: useId() }
const form = reactive(emptyFoodForm())
const errors = reactive({})
const submitted = ref(false)

const isNew = computed(() => !props.foodId)
const ready = computed(() => owner.status === 'ready' && owner.foodsStatus === 'ready')
const existing = computed(() => (isNew.value ? null : owner.foodById(props.foodId)))
const categoryIds = computed(() => menu.categories.map((c) => c.id))
const previewUrl = computed(() =>
  form.imageUrl && !validateImageUrl(form.imageUrl) ? form.imageUrl.trim() : '',
)

watch(
  [ready, existing],
  () => {
    if (ready.value)
      Object.assign(form, existing.value ? foodToForm(existing.value) : emptyFoodForm())
  },
  { immediate: true },
)

watch(form, () => {
  if (submitted.value) Object.assign(errors, validateFood(form, categoryIds.value))
})

onMounted(async () => {
  await owner.load()
  if (owner.restaurant) await owner.loadFoods()
})

function addSize() {
  form.sizes.push({ id: null, name: '', priceDelta: '0', isDefault: form.sizes.length === 0 })
}

function removeSize(index) {
  const [removed] = form.sizes.splice(index, 1)
  if (removed.isDefault && form.sizes.length) form.sizes[0].isDefault = true
}

function setDefaultSize(index) {
  form.sizes.forEach((size, i) => (size.isDefault = i === index))
}

function addTopping() {
  form.toppings.push({ id: null, name: '', price: '0' })
}

async function save() {
  submitted.value = true
  Object.assign(errors, validateFood(form, categoryIds.value))
  if (!isValid(errors)) return
  const result = await owner.saveFood(form)
  if (!result.ok) {
    if (result.message) toast.show(result.message, { tone: 'error' })
    return
  }
  toast.show(result.created ? `Đã thêm món ${form.name.trim()}.` : 'Đã lưu món.', {
    tone: 'success',
  })
  router.push({ name: 'my-restaurant' })
}
</script>

<template>
  <ErrorState
    v-if="owner.status === 'error' || owner.foodsStatus === 'error'"
    title="Không tải được thực đơn của quán"
    :message="owner.error"
    @retry="owner.load().then(() => owner.loadFoods())"
  />

  <div
    v-else-if="owner.status === 'ready' && !owner.restaurant"
    class="mx-auto max-w-lg space-y-4 text-center"
  >
    <h1 class="text-2xl font-bold">Bạn chưa có quán</h1>
    <p class="text-stone-600">Đăng ký quán trước, rồi thêm món vào thực đơn.</p>
    <RouterLink
      :to="{ name: 'my-restaurant' }"
      class="inline-block rounded-2xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
    >
      Đăng ký quán
    </RouterLink>
  </div>

  <div v-else-if="!ready" class="mx-auto h-96 max-w-2xl animate-pulse rounded-3xl bg-stone-200" />

  <NotFoundView
    v-else-if="!isNew && !existing"
    title="Không tìm thấy món"
    message="Món này không có trong quán của bạn hoặc đã bị xóa."
  />

  <section v-else class="mx-auto max-w-2xl space-y-6">
    <nav aria-label="Đường dẫn" class="text-sm text-stone-500">
      <RouterLink :to="{ name: 'my-restaurant' }" class="hover:underline">
        ‹ Quán của tôi
      </RouterLink>
    </nav>
    <h1 class="text-2xl font-bold">{{ isNew ? 'Thêm món' : `Sửa món ${existing.name}` }}</h1>

    <form
      class="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
      novalidate
      @submit.prevent="save"
    >
      <TextField v-model="form.name" label="Tên món" required :error="errors.name" />

      <div class="space-y-1.5">
        <label :for="ids.description" class="block text-sm font-medium">Mô tả</label>
        <textarea
          :id="ids.description"
          v-model="form.description"
          rows="3"
          :maxlength="FOOD_DESCRIPTION_MAX"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 focus-visible:border-brand-600"
        />
        <p class="text-xs text-stone-500">
          {{ form.description.length }}/{{ FOOD_DESCRIPTION_MAX }} ký tự
        </p>
      </div>

      <TextField
        v-model="form.imageUrl"
        label="Ảnh món (đường dẫn)"
        type="url"
        inputmode="url"
        hint="Dán đường dẫn ảnh bắt đầu bằng https://"
        :error="errors.imageUrl"
      />
      <div v-if="previewUrl" class="size-40 overflow-hidden rounded-2xl border border-stone-200">
        <SmartImage :src="previewUrl" alt="Xem trước ảnh món" :width="320" :height="320" />
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <TextField
          v-model="form.basePrice"
          label="Giá gốc (đ)"
          type="number"
          inputmode="numeric"
          required
          :error="errors.basePrice"
        />
        <TextField
          v-model="form.stock"
          label="Tồn kho (phần)"
          type="number"
          inputmode="numeric"
          required
          :error="errors.stock"
        />
        <TextField
          v-model="form.calories"
          label="Năng lượng (kcal)"
          type="number"
          inputmode="numeric"
          :error="errors.calories"
        />
      </div>

      <div class="space-y-1.5">
        <label :for="ids.category" class="block text-sm font-medium">Danh mục</label>
        <select
          :id="ids.category"
          v-model="form.categoryId"
          class="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 focus-visible:border-brand-600"
        >
          <option value="">Không chọn</option>
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

      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">Tag khẩu vị (giúp AI gợi ý đúng món)</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="tag in FOOD_TAGS"
            :key="tag"
            class="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm has-checked:border-brand-600 has-checked:bg-brand-50"
          >
            <input v-model="form.tags" type="checkbox" :value="tag" class="accent-brand-600" />
            <span aria-hidden="true">{{ tagLabel(tag).icon }}</span> {{ tagLabel(tag).label }}
          </label>
        </div>
      </fieldset>

      <label class="flex items-center gap-3 text-sm">
        <input v-model="form.hasSpice" type="checkbox" class="size-5 accent-brand-600" />
        <span>Cho khách chọn độ cay (0–4)</span>
      </label>

      <fieldset class="space-y-3" :aria-describedby="errors.sizes ? ids.sizes : undefined">
        <legend class="text-sm font-medium">Size (mỗi size có phụ thu riêng)</legend>
        <p v-if="!form.sizes.length" class="text-sm text-stone-500">
          Món không có size. Thêm size nếu món có nhiều phần ăn.
        </p>
        <div
          v-for="(size, index) in form.sizes"
          :key="size.id ?? `new-${index}`"
          class="flex flex-wrap items-center gap-2"
        >
          <input
            v-model="size.name"
            :aria-label="`Tên size ${index + 1}`"
            placeholder="Tên size, ví dụ Lớn"
            maxlength="40"
            class="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            v-model="size.priceDelta"
            :aria-label="`Phụ thu size ${index + 1} (đ)`"
            type="number"
            inputmode="numeric"
            min="0"
            class="w-28 rounded-xl border border-stone-300 px-3 py-2"
          />
          <label class="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="default-size"
              :checked="size.isDefault"
              class="accent-brand-600"
              @change="setDefaultSize(index)"
            />
            Mặc định
          </label>
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-sm text-red-700 hover:bg-red-50"
            :aria-label="`Bỏ size ${size.name || index + 1}`"
            @click="removeSize(index)"
          >
            Bỏ
          </button>
        </div>
        <button
          v-if="form.sizes.length < MAX_SIZES"
          type="button"
          class="text-sm font-medium text-brand-700 hover:underline"
          @click="addSize"
        >
          + Thêm size
        </button>
        <p v-if="errors.sizes" :id="ids.sizes" class="text-sm text-red-700">{{ errors.sizes }}</p>
      </fieldset>

      <fieldset class="space-y-3" :aria-describedby="errors.toppings ? ids.toppings : undefined">
        <legend class="text-sm font-medium">Topping (khách chọn được nhiều)</legend>
        <div
          v-for="(topping, index) in form.toppings"
          :key="topping.id ?? `new-${index}`"
          class="flex flex-wrap items-center gap-2"
        >
          <input
            v-model="topping.name"
            :aria-label="`Tên topping ${index + 1}`"
            placeholder="Tên topping, ví dụ Trứng"
            maxlength="40"
            class="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2"
          />
          <input
            v-model="topping.price"
            :aria-label="`Giá topping ${index + 1} (đ)`"
            type="number"
            inputmode="numeric"
            min="0"
            class="w-28 rounded-xl border border-stone-300 px-3 py-2"
          />
          <button
            type="button"
            class="rounded-lg px-2 py-1 text-sm text-red-700 hover:bg-red-50"
            :aria-label="`Bỏ topping ${topping.name || index + 1}`"
            @click="form.toppings.splice(index, 1)"
          >
            Bỏ
          </button>
        </div>
        <button
          v-if="form.toppings.length < MAX_TOPPINGS"
          type="button"
          class="text-sm font-medium text-brand-700 hover:underline"
          @click="addTopping"
        >
          + Thêm topping
        </button>
        <p v-if="errors.toppings" :id="ids.toppings" class="text-sm text-red-700">
          {{ errors.toppings }}
        </p>
      </fieldset>

      <label class="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <input v-model="form.isAvailable" type="checkbox" class="mt-1 size-5 accent-brand-600" />
        <span class="text-sm">
          <span class="font-medium">Đang bán</span>
          <span class="block text-stone-600">
            Bỏ chọn để Ngừng bán: món ẩn khỏi thực đơn nhưng vẫn giữ lại để bán sau.
          </span>
        </span>
      </label>

      <button
        type="submit"
        :disabled="owner.saving"
        class="w-full rounded-2xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {{ owner.saving ? 'Đang lưu…' : isNew ? 'Thêm món' : 'Lưu món' }}
      </button>
    </form>
  </section>
</template>
