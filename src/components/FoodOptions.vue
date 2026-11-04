<script setup>
import { computed, reactive, watch } from 'vue'
import { formatVND } from '@/lib/format'
import {
  MAX_QUANTITY_PER_ADD,
  SPICE_LABELS,
  clampQuantity,
  defaultSelection,
  lineTotal,
  normalizeSpice,
  normalizeToppingIds,
  unitPrice,
} from '@/lib/pricing'
import { SPICE_LEVELS } from '@/lib/constants'

const props = defineProps({
  food: { type: Object, required: true },
  /** Số phần còn có thể thêm (tồn kho trừ phần đã có trong giỏ). */
  available: { type: Number, required: true },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['add'])

// Mọi tùy chọn gắn vào form bằng v-model; giá tính lại bằng computed.
const selection = reactive(defaultSelection(props.food))
watch(
  () => props.food.id,
  () => Object.assign(selection, defaultSelection(props.food)),
)

const maxQuantity = computed(() => Math.min(props.available, MAX_QUANTITY_PER_ADD))
const soldOut = computed(() => props.available <= 0)

// Giữ số lượng hợp lệ khi người dùng gõ tay hoặc khi tồn kho thay đổi.
watch([() => selection.quantity, maxQuantity], ([quantity, max]) => {
  if (max <= 0) return
  const clamped = clampQuantity(quantity, max)
  if (clamped !== quantity) selection.quantity = clamped
})

const unit = computed(() => unitPrice(props.food, selection))
const total = computed(() => lineTotal(props.food, selection))

function step(delta) {
  selection.quantity = clampQuantity(selection.quantity + delta, maxQuantity.value) || 1
}

function submit() {
  if (soldOut.value || props.busy) return
  emit('add', {
    foodId: props.food.id,
    sizeId: selection.sizeId,
    toppingIds: normalizeToppingIds(props.food, selection.toppingIds),
    spiceLevel: normalizeSpice(props.food, selection.spiceLevel),
    quantity: clampQuantity(selection.quantity, maxQuantity.value),
  })
}

const fieldsetClass = 'space-y-2'
const optionClass =
  'flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600'
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <fieldset v-if="food.sizes.length" :class="fieldsetClass">
      <legend class="mb-2 font-semibold">Chọn size</legend>
      <label v-for="size in food.sizes" :key="size.id" :class="optionClass">
        <span class="flex items-center gap-3">
          <input
            v-model="selection.sizeId"
            type="radio"
            name="size"
            :value="size.id"
            class="size-4 accent-brand-600"
          />
          {{ size.name }}
        </span>
        <span class="text-sm text-stone-600">
          {{ size.priceDelta ? `+${formatVND(size.priceDelta)}` : 'Giá gốc' }}
        </span>
      </label>
    </fieldset>

    <fieldset v-if="food.toppings.length" :class="fieldsetClass">
      <legend class="mb-2 font-semibold">
        Thêm topping <span class="font-normal text-stone-500">(không bắt buộc)</span>
      </legend>
      <label v-for="topping in food.toppings" :key="topping.id" :class="optionClass">
        <span class="flex items-center gap-3">
          <input
            v-model="selection.toppingIds"
            type="checkbox"
            :value="topping.id"
            class="size-4 rounded accent-brand-600"
          />
          {{ topping.name }}
        </span>
        <span class="text-sm text-stone-600">+{{ formatVND(topping.price) }}</span>
      </label>
    </fieldset>

    <fieldset v-if="food.hasSpice" :class="fieldsetClass">
      <legend class="mb-2 font-semibold">Độ cay</legend>
      <div class="grid grid-cols-5 gap-2">
        <label
          v-for="level in SPICE_LEVELS"
          :key="level"
          class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white px-1 py-2 text-center text-xs transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"
        >
          <input
            v-model="selection.spiceLevel"
            type="radio"
            name="spice"
            :value="level"
            class="sr-only"
          />
          <span aria-hidden="true">{{ level === 0 ? '🙂' : '🌶️'.repeat(level) }}</span>
          <span>{{ SPICE_LABELS[level] }}</span>
        </label>
      </div>
    </fieldset>

    <div v-if="!soldOut" class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <label for="quantity" class="font-semibold">Số lượng</label>
        <div class="flex items-center rounded-xl border border-stone-300 bg-white">
          <button
            type="button"
            class="size-10 rounded-l-xl text-lg hover:bg-stone-100 disabled:opacity-40"
            :disabled="soldOut || selection.quantity <= 1"
            aria-label="Giảm số lượng"
            @click="step(-1)"
          >
            −
          </button>
          <input
            id="quantity"
            v-model.number="selection.quantity"
            type="number"
            inputmode="numeric"
            min="1"
            :max="Math.max(maxQuantity, 1)"
            :disabled="soldOut"
            class="w-12 [appearance:textfield] border-x border-stone-300 py-2 text-center [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            class="size-10 rounded-r-xl text-lg hover:bg-stone-100 disabled:opacity-40"
            :disabled="soldOut || selection.quantity >= maxQuantity"
            aria-label="Tăng số lượng"
            @click="step(1)"
          >
            +
          </button>
        </div>
      </div>
      <p v-if="!soldOut" class="text-sm text-stone-500">Còn có thể đặt {{ available }} phần</p>
    </div>

    <div class="rounded-2xl bg-stone-100 p-4">
      <div class="flex items-baseline justify-between text-sm text-stone-600">
        <span>Đơn giá</span>
        <span>{{ formatVND(unit) }}</span>
      </div>
      <div class="mt-1 flex items-baseline justify-between">
        <span class="font-semibold">Tạm tính</span>
        <output class="text-2xl font-bold text-brand-700" aria-live="polite">
          {{ formatVND(total) }}
        </output>
      </div>
    </div>

    <button
      v-if="soldOut"
      type="button"
      disabled
      class="w-full cursor-not-allowed rounded-2xl bg-stone-300 py-3.5 font-semibold text-stone-600"
    >
      Hết món
    </button>
    <button
      v-else
      type="submit"
      :disabled="busy"
      class="w-full rounded-2xl bg-brand-600 py-3.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
    >
      Thêm vào giỏ · {{ formatVND(total) }}
    </button>
  </form>
</template>
