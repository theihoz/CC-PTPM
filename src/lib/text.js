/**
 * Chuẩn hóa chuỗi tiếng Việt để tìm kiếm: chữ thường, bỏ dấu, đ → d, gộp khoảng trắng.
 * Ví dụ: "  Phở  Bò " → "pho bo".
 */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
