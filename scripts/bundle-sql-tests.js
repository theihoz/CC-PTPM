// Gộp các kịch bản test SQL thành một file để dán một lần vào Supabase SQL Editor.
// Chạy: npm run db:test-bundle  → supabase/tests/all_tests.sql
// Mỗi kịch bản tự BEGIN … ROLLBACK nên chạy nối tiếp không để lại dữ liệu.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = (name) => fileURLToPath(new URL(`../supabase/tests/${name}`, import.meta.url))

const ORDER = [
  ['rls_test.sql', 'RLS thực đơn, hồ sơ, giỏ hàng', 6],
  ['place_order_test.sql', 'Đặt hàng (place_order)', 9],
  ['cancel_order_test.sql', 'Hủy đơn (cancel_order)', 6],
  ['restaurant_owner_test.sql', 'Chủ quán: đăng ký, sửa quán, Tạm đóng', 6],
]

const total = ORDER.reduce((sum, [, , n]) => sum + n, 0)
const header = `-- ============================================================================
-- TẤT CẢ kịch bản test SQL, chạy theo thứ tự. FILE SINH TỰ ĐỘNG, đừng sửa tay.
-- Nguồn: supabase/tests/*.sql · Sinh lại: npm run db:test-bundle
-- ----------------------------------------------------------------------------
-- Dán vào Supabase SQL Editor rồi Run. Kết quả mong đợi: ${total} dòng "PASS …"
-- trong tab Messages, không có "FAIL". Mỗi phần tự ROLLBACK, không để lại dữ liệu.
${ORDER.map(([file, label, n], i) => `--   Phần ${i + 1}: ${label} (${file}): ${n} PASS`).join('\n')}
-- ============================================================================
`

const body = ORDER.map(
  ([file, label], i) =>
    `\n-- ##########################################################################\n` +
    `-- Phần ${i + 1}: ${label} · ${file}\n` +
    `-- ##########################################################################\n\n` +
    readFileSync(dir(file), 'utf8').trim() +
    '\n',
).join('')

writeFileSync(dir('all_tests.sql'), header + body)
console.log(`Đã ghi supabase/tests/all_tests.sql (${ORDER.length} phần, ${total} kiểm tra).`)
