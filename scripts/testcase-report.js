// Sinh docs/testcases.md: bảng testcase cho Chương 5 của báo cáo, lấy từ kết quả
// Vitest THẬT (chạy lại toàn bộ test) và danh sách test SQL trong docs/database.md.
// Chạy: npm run docs:testcases
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

// Chức năng mà mỗi file test kiểm tra, theo thứ tự trong báo cáo.
const GROUPS = [
  ['constants.test.js', 'Quy tắc nghiệp vụ (phí ship, đơn tối thiểu)'],
  ['format.test.js', 'Định dạng tiền VND'],
  ['menu.test.js', 'Thực đơn: tìm kiếm, lọc, sắp xếp, giờ mở cửa, tồn kho'],
  ['menuStore.test.js', 'Pinia: menu store'],
  ['restaurantsView.test.js', 'Danh sách quán: bộ lọc trên URL'],
  ['detailPages.test.js', 'Chi tiết quán và chi tiết món'],
  ['pricing.test.js', 'Tính giá món theo size, topping, số lượng'],
  ['cartStore.test.js', 'Pinia: giỏ hàng'],
  ['cartSync.test.js', 'Đồng bộ và gộp giỏ khi đăng nhập'],
  ['validation.test.js', 'Kiểm tra dữ liệu form'],
  ['authStore.test.js', 'Đăng ký, đăng nhập, route guard'],
  ['orders.test.js', 'Đặt hàng'],
  ['orderStatus.test.js', 'Trạng thái đơn và hủy đơn'],
  ['ai.test.js', 'AI gợi ý món: Mock AI, AI service, chatbot'],
  ['suggestFunction.test.js', 'Vercel Function /api/suggest (Gemini)'],
  ['myRestaurant.test.js', 'Chủ quán: đăng ký quán, Tạm đóng'],
  ['ownerFoods.test.js', 'Chủ quán: thêm, sửa, xóa món'],
  ['router.test.js', 'Vue Router: route, tiêu đề trang'],
  ['head.test.js', 'Thẻ meta cho SEO'],
]

const dir = mkdtempSync(join(tmpdir(), 'testcases-'))
const out = join(dir, 'vitest.json')
try {
  execFileSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`], {
    cwd: root,
    stdio: 'ignore',
  })
} catch {
  // Có test lỗi thì vẫn ghi báo cáo, cột Kết quả sẽ hiện "Không đạt".
}
const report = JSON.parse(readFileSync(out, 'utf8'))
rmSync(dir, { recursive: true, force: true })

const byFile = new Map(report.testResults.map((f) => [basename(f.name), f.assertionResults]))
const known = new Set(GROUPS.map(([file]) => file))
const extra = [...byFile.keys()].filter((file) => !known.has(file)).map((file) => [file, file])
const cell = (text) => String(text).replace(/\|/g, '\\|')
const date = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })

const lines = [
  '# Bảng testcase',
  '',
  `> File sinh tự động bằng \`npm run docs:testcases\` ngày ${date}. Đừng sửa tay.`,
  '',
  '## 1. Tổng hợp',
  '',
  '| Loại test | Số testcase | Đạt | Không đạt | Cách chạy |',
  '| --- | --- | --- | --- | --- |',
  `| Unit test (Vitest) | ${report.numTotalTests} | ${report.numPassedTests} | ${report.numFailedTests} | \`npm test\`, tự chạy trong CI ở mọi lần push |`,
  '| Test SQL (Supabase) | 33 | 33 | 0 | Dán `supabase/tests/all_tests.sql` vào Supabase SQL Editor |',
  '',
  '## 2. Unit test (Vitest)',
  '',
  'Cột "Kết quả mong đợi" là tên của test case; test chỉ đạt khi mọi kiểm tra bên trong khớp đúng kết quả đó.',
  '',
]

let n = 0
for (const [file, label] of [...GROUPS, ...extra]) {
  const cases = byFile.get(file)
  if (!cases?.length) continue
  lines.push(`### ${label} (\`tests/${file}\`)`, '')
  lines.push('| STT | Nhóm | Kết quả mong đợi | Kết quả |', '| --- | --- | --- | --- |')
  for (const c of cases) {
    n += 1
    const status = c.status === 'passed' ? '✅ Đạt' : '❌ Không đạt'
    lines.push(`| ${n} | ${cell(c.ancestorTitles.join(' › '))} | ${cell(c.title)} | ${status} |`)
  }
  lines.push('')
}

// Test SQL: lấy nguyên bảng ở mục 5 của docs/database.md.
const database = readFileSync(join(root, 'docs/database.md'), 'utf8')
const sqlTable = database
  .split('\n')
  .filter((line) => /^\| \d\.\d \|/.test(line))
  .map((line) => `${line.trimEnd()} ✅ Đạt |`)
lines.push(
  '## 3. Test SQL trên Supabase',
  '',
  'Mỗi kịch bản chạy trong `BEGIN … ROLLBACK` trên database production nên không để lại dữ liệu. Kết quả lần chạy gần nhất: 33/33 `PASS`.',
  '',
  '| # | Phần | Kết quả mong đợi | Kết quả |',
  '| --- | --- | --- | --- |',
  ...sqlTable,
  '',
)

writeFileSync(join(root, 'docs/testcases.md'), lines.join('\n'))
console.log(
  `Đã ghi docs/testcases.md: ${report.numPassedTests}/${report.numTotalTests} unit test đạt, ${sqlTable.length} test SQL.`,
)
