import { onBeforeUnmount, ref } from 'vue'

/** Thời điểm hiện tại, tự cập nhật mỗi `intervalMs`. Dừng khi component bị hủy. */
export function useNow(intervalMs = 1000) {
  const now = ref(Date.now())
  const timer = setInterval(() => (now.value = Date.now()), intervalMs)
  onBeforeUnmount(() => clearInterval(timer))
  return now
}
