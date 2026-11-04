<script setup>
import { nextTick, ref, watch } from 'vue'

// Hộp thoại xác nhận dùng <dialog> gốc của trình duyệt: tự bẫy focus, đóng bằng Esc.
const props = defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Đồng ý' },
  cancelLabel: { type: String, default: 'Hủy' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])

const dialog = ref(null)

watch(
  () => props.open,
  async (open) => {
    await nextTick()
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal ? el.showModal() : el.setAttribute('open', '')
    if (!open && el.open) el.close ? el.close() : el.removeAttribute('open')
  },
  { immediate: true },
)
</script>

<template>
  <dialog
    ref="dialog"
    class="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-0 shadow-xl backdrop:bg-stone-900/50"
    aria-labelledby="confirm-title"
    @cancel.prevent="emit('cancel')"
  >
    <div class="space-y-3 p-6">
      <h2 id="confirm-title" class="text-lg font-semibold">{{ title }}</h2>
      <p v-if="message" class="text-stone-600">{{ message }}</p>
      <div class="flex justify-end gap-3 pt-3">
        <button
          type="button"
          class="rounded-xl border border-stone-300 px-4 py-2 font-medium hover:bg-stone-100"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="rounded-xl px-4 py-2 font-medium text-white"
          :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>
