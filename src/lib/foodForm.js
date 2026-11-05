// Logic thuần của form món cho Chủ quán: giá trị mặc định, chuyển đổi, kiểm tra.
import { TAG_LABELS } from './tags'
import { validateImageUrl } from './validation'

export const FOOD_NAME_MAX = 80
export const FOOD_DESCRIPTION_MAX = 300
export const OPTION_NAME_MAX = 40
export const MAX_PRICE = 10_000_000
export const MAX_STOCK = 9999
export const MAX_SIZES = 10
export const MAX_TOPPINGS = 20
export const FOOD_TAGS = Object.keys(TAG_LABELS)

export function emptyFoodForm() {
  return {
    id: null,
    name: '',
    description: '',
    imageUrl: '',
    basePrice: '',
    calories: '',
    tags: [],
    stock: '',
    hasSpice: false,
    categoryId: '',
    isAvailable: true,
    sizes: [],
    toppings: [],
  }
}

/** Món từ my_foods() thành giá trị form (số chuyển thành chuỗi cho ô nhập). */
export function foodToForm(food) {
  return {
    id: food.id,
    name: food.name,
    description: food.description,
    imageUrl: food.imageUrl,
    basePrice: String(food.basePrice),
    calories: String(food.calories),
    tags: [...food.tags],
    stock: String(food.stock),
    hasSpice: food.hasSpice,
    categoryId: food.categoryId == null ? '' : String(food.categoryId),
    isAvailable: food.isAvailable,
    sizes: food.sizes.map((s) => ({
      id: s.id,
      name: s.name,
      priceDelta: String(s.priceDelta),
      isDefault: s.isDefault,
    })),
    toppings: food.toppings.map((t) => ({ id: t.id, name: t.name, price: String(t.price) })),
  }
}

const isIntIn = (value, min, max) => {
  if (String(value ?? '').trim() === '') return false
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max
}

function optionError(options, priceKey, label, max) {
  if (options.length > max) return `Tối đa ${max} ${label}.`
  const names = options.map((o) => String(o.name ?? '').trim())
  if (names.some((n) => !n)) return `Vui lòng nhập tên cho mọi ${label}.`
  if (names.some((n) => n.length > OPTION_NAME_MAX))
    return `Tên ${label} tối đa ${OPTION_NAME_MAX} ký tự.`
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
    return `Tên ${label} không được trùng nhau.`
  if (options.some((o) => !isIntIn(o[priceKey] === '' ? '0' : o[priceKey], 0, MAX_PRICE)))
    return `Giá ${label} phải là số nguyên từ 0 đến ${MAX_PRICE.toLocaleString('vi-VN')}đ.`
  return ''
}

/** Kiểm tra form món; trả về object lỗi theo từng trường ('' là hợp lệ). */
export function validateFood(form, categoryIds = []) {
  const name = String(form.name ?? '').trim()
  const sizes = form.sizes ?? []
  const toppings = form.toppings ?? []
  let sizesError = optionError(sizes, 'priceDelta', 'size', MAX_SIZES)
  if (!sizesError && sizes.length && sizes.filter((s) => s.isDefault).length !== 1)
    sizesError = 'Chọn đúng một size mặc định.'
  return {
    name: !name
      ? 'Vui lòng nhập tên món.'
      : name.length < 2
        ? 'Tên món quá ngắn.'
        : name.length > FOOD_NAME_MAX
          ? `Tên món tối đa ${FOOD_NAME_MAX} ký tự.`
          : '',
    description:
      String(form.description ?? '').trim().length > FOOD_DESCRIPTION_MAX
        ? `Mô tả tối đa ${FOOD_DESCRIPTION_MAX} ký tự.`
        : '',
    imageUrl: validateImageUrl(form.imageUrl),
    basePrice: isIntIn(form.basePrice, 0, MAX_PRICE)
      ? ''
      : `Giá phải là số nguyên từ 0 đến ${MAX_PRICE.toLocaleString('vi-VN')}đ.`,
    calories: isIntIn(form.calories === '' ? '0' : form.calories, 0, 10000)
      ? ''
      : 'Calo từ 0 đến 10.000.',
    stock: isIntIn(form.stock, 0, MAX_STOCK) ? '' : `Tồn kho từ 0 đến ${MAX_STOCK}.`,
    categoryId:
      form.categoryId === '' || categoryIds.includes(Number(form.categoryId))
        ? ''
        : 'Danh mục không hợp lệ.',
    tags: (form.tags ?? []).every((t) => FOOD_TAGS.includes(t)) ? '' : 'Tag không hợp lệ.',
    sizes: sizesError,
    toppings: optionError(toppings, 'price', 'topping', MAX_TOPPINGS),
  }
}

/** Giá trị form thành payload cho RPC save_food. */
export function toFoodPayload(form) {
  const num = (value) => (String(value ?? '').trim() === '' ? 0 : Number(value))
  return {
    ...(form.id ? { id: form.id } : {}),
    name: form.name.trim(),
    description: (form.description ?? '').trim(),
    imageUrl: (form.imageUrl ?? '').trim(),
    basePrice: num(form.basePrice),
    calories: num(form.calories),
    tags: [...new Set(form.tags)].sort(),
    stock: num(form.stock),
    hasSpice: Boolean(form.hasSpice),
    categoryId: form.categoryId === '' ? null : Number(form.categoryId),
    isAvailable: Boolean(form.isAvailable),
    sizes: form.sizes.map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      name: s.name.trim(),
      priceDelta: num(s.priceDelta),
      isDefault: Boolean(s.isDefault),
    })),
    toppings: form.toppings.map((t) => ({
      ...(t.id ? { id: t.id } : {}),
      name: t.name.trim(),
      price: num(t.price),
    })),
  }
}
