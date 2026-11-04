// Cập nhật <title> và <meta name="description"> cho từng trang.
import { APP_NAME } from './constants'

export const DEFAULT_DESCRIPTION =
  'FoodieGo: đặt món ăn trực tuyến, giao tận nơi tại TP.HCM. Tìm quán, tùy chỉnh món và để AI gợi ý thực đơn hợp khẩu vị.'

export function setPageHead({ title, description } = {}) {
  if (typeof document === 'undefined') return
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  let tag = document.querySelector('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', description || DEFAULT_DESCRIPTION)
}
