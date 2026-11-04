import { watchEffect } from 'vue'
import { APP_NAME } from '@/lib/constants'

/** Đặt tiêu đề tab theo dữ liệu động (tên quán, tên món) khi đã có. */
export function usePageTitle(getTitle) {
  watchEffect(() => {
    const title = getTitle()
    if (title) document.title = `${title} · ${APP_NAME}`
  })
}
