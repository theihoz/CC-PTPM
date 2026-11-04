/**
 * Thêm tham số resize cho ảnh Unsplash để tải đúng kích thước cần dùng.
 * Ảnh từ nguồn khác được trả nguyên.
 */
export function sizedImage(url, width, height = Math.round((width * 3) / 4)) {
  if (!url) return ''
  if (!url.startsWith('https://images.unsplash.com/')) return url
  const params = new URLSearchParams({
    w: String(width),
    h: String(height),
    fit: 'crop',
    auto: 'format',
    q: '70',
  })
  return `${url}?${params}`
}
