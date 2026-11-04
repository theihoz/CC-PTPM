// Sinh supabase/seed.sql từ src/data/menuSeed.js.
// Chạy: npm run db:seed
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { categories, restaurants, foods, foodSizes, foodToppings } from '../src/data/menuSeed.js'

const OUT = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url))

function literal(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return `array[${value.map(literal).join(', ')}]::text[]`
  }
  return `'${String(value).replaceAll("'", "''")}'`
}

function insert(table, columns, rows) {
  const values = rows
    .map((row) => `  (${columns.map((c) => literal(row[c])).join(', ')})`)
    .join(',\n')
  return [
    `insert into public.${table} (${columns.join(', ')}) overriding system value values`,
    values,
    `;`,
    `select setval(pg_get_serial_sequence('public.${table}', 'id'), (select max(id) from public.${table}));`,
  ].join('\n')
}

const sql = `-- ============================================================================
-- Dữ liệu mẫu cho thực đơn. FILE SINH TỰ ĐỘNG, đừng sửa tay.
-- Nguồn: src/data/menuSeed.js · Sinh lại: npm run db:seed
-- ----------------------------------------------------------------------------
-- Chạy trong Supabase SQL Editor SAU migration thực đơn.
-- Xóa sạch dữ liệu thực đơn cũ rồi nạp lại, nên chạy lại nhiều lần vẫn an toàn.
-- ${categories.length} danh mục · ${restaurants.length} quán · ${foods.length} món · ${foodSizes.length} size · ${foodToppings.length} topping
-- ============================================================================

begin;

truncate public.food_toppings, public.food_sizes, public.foods, public.restaurants, public.categories
  restart identity cascade;

${insert('categories', ['id', 'slug', 'name', 'icon', 'sort_order'], categories)}

${insert(
  'restaurants',
  [
    'id',
    'slug',
    'name',
    'description',
    'image_url',
    'address',
    'category_id',
    'rating',
    'rating_count',
    'delivery_time_min',
    'open_time',
    'close_time',
    'is_featured',
  ],
  restaurants,
)}

${insert(
  'foods',
  [
    'id',
    'restaurant_id',
    'category_id',
    'name',
    'description',
    'image_url',
    'base_price',
    'calories',
    'tags',
    'stock',
    'has_spice',
    'is_featured',
    'is_available',
    'sort_order',
  ],
  foods,
)}

${insert('food_sizes', ['id', 'food_id', 'name', 'price_delta', 'is_default', 'sort_order'], foodSizes)}

${insert('food_toppings', ['id', 'food_id', 'name', 'price', 'sort_order'], foodToppings)}

commit;
`

writeFileSync(OUT, sql)
console.log(
  `Đã ghi ${OUT}: ${restaurants.length} quán, ${foods.length} món, ${foodSizes.length} size, ${foodToppings.length} topping.`,
)
