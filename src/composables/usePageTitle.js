import { watchEffect } from 'vue'
import { setPageHead } from '@/lib/head'

/**
 * Đặt tiêu đề tab và meta description theo dữ liệu động (tên quán, tên món) khi đã có.
 * getTitle / getDescription trả về '' khi dữ liệu chưa sẵn sàng.
 */
export function usePageTitle(getTitle, getDescription = () => '') {
  watchEffect(() => {
    const title = getTitle()
    if (title) setPageHead({ title, description: getDescription() })
  })
}
