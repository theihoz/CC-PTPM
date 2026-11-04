<script setup>
defineProps({
  title: { type: String, default: 'Đã có lỗi xảy ra' },
  message: { type: String, default: 'Không tải được dữ liệu. Vui lòng thử lại.' },
  retryable: { type: Boolean, default: true },
})
defineEmits(['retry'])
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center"
  >
    <p class="text-3xl" aria-hidden="true">😕</p>
    <p class="mt-3 font-semibold text-red-900">{{ title }}</p>
    <p class="mt-1 text-sm text-red-800">{{ message }}</p>
    <button
      v-if="retryable"
      type="button"
      class="mt-5 rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
      @click="$emit('retry')"
    >
      Thử lại
    </button>
  </div>
</template>
