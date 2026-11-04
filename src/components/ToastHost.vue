<script setup>
import { RouterLink } from 'vue-router'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const toneClass = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-stone-200 bg-white text-stone-900',
}
const icon = { success: '✅', error: '⚠️', info: 'ℹ️' }
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-150"
    >
      <div
        v-for="item in toast.toasts"
        :key="item.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg"
        :class="toneClass[item.tone]"
      >
        <span aria-hidden="true">{{ icon[item.tone] }}</span>
        <p class="flex-1">
          {{ item.message }}
          <RouterLink
            v-if="item.action"
            :to="item.action.to"
            class="ml-1 font-semibold underline"
            @click="toast.dismiss(item.id)"
          >
            {{ item.action.label }}
          </RouterLink>
        </p>
        <button
          type="button"
          class="-m-1 rounded p-1 opacity-60 hover:opacity-100"
          aria-label="Đóng thông báo"
          @click="toast.dismiss(item.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
