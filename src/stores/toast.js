import { ref } from 'vue'
import { defineStore } from 'pinia'

const DEFAULT_DURATION = 3500
let nextId = 1

/** Thông báo ngắn ở góc màn hình. tone: 'success' | 'error' | 'info'. */
export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** action: { label, to } để hiện một liên kết trong thông báo. */
  function show(message, { tone = 'success', action = null, duration = DEFAULT_DURATION } = {}) {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, message, tone, action }]
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }

  return { toasts, show, dismiss }
})
