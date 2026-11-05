import { normalizeText } from './text'

export const SLUG_MAX_LENGTH = 60

/**
 * Sinh slug cho đường dẫn từ tên tiếng Việt: bỏ dấu, chữ thường, nối bằng gạch ngang.
 * Ví dụ: "Bún Chả Hà Nội!" → "bun-cha-ha-noi". Tên không có chữ/số nào thì trả về "quan".
 * Máy chủ tự thêm -2, -3… khi slug đã có quán dùng.
 */
export function slugify(value) {
  const slug = normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '')
  return slug || 'quan'
}
