# FoodieGo: Website đặt món và giao đồ ăn

Đồ án: hệ thống đặt món trực tuyến xây dựng bằng Vue 3, Vue Router và Pinia, có AI gợi ý thực đơn.
Spec nằm ở issue [#1](https://github.com/theihoz/CC-PTPM/issues/1), các ticket là sub-issue của issue đó.

## Chạy ở máy

Cần Node 22 trở lên.

```bash
npm install
cp .env.example .env   # rồi điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
npm run dev
```

Nếu chưa điền Supabase, `npm run dev` tự dùng dữ liệu mẫu trong `src/data/menuSeed.js`. Bản build
production thì bắt buộc phải có Supabase.

| Lệnh                   | Việc                                                   |
| ---------------------- | ------------------------------------------------------ |
| `npm run dev`          | Chạy dev server của Vite                               |
| `npm run build`        | Build production vào `dist/`                           |
| `npm run lint`         | Chạy ESLint                                            |
| `npm run format:check` | Kiểm tra định dạng bằng Prettier                       |
| `npm test`             | Chạy Vitest                                            |
| `npm run db:seed`      | Sinh lại `supabase/seed.sql` từ `src/data/menuSeed.js` |

## Database (Supabase)

Các file SQL nằm trong `supabase/`. Bạn chạy chúng bằng tay trong Supabase Dashboard → **SQL Editor**, theo
đúng thứ tự:

1. Các file trong `supabase/migrations/`, theo thứ tự tên file. Mỗi file tạo bảng, ràng buộc, index, trigger
   và RLS.
2. `supabase/seed.sql`: nạp dữ liệu mẫu (6 danh mục, 7 quán, 41 món). File này xóa dữ liệu thực đơn cũ
   trước khi nạp, nên chạy lại nhiều lần vẫn an toàn.

Muốn sửa dữ liệu mẫu thì sửa `src/data/menuSeed.js`, chạy `npm run db:seed`, rồi chạy lại `seed.sql`.

Lấy `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` ở Project Settings → API (dùng anon/publishable key, không
dùng service_role).

## CI/CD

Workflow `.github/workflows/ci.yml` chạy lint, kiểm tra định dạng, test và build. Sau đó nó deploy lên Vercel:

- Push lên `main` thì deploy **production**.
- Pull Request vào `main` thì deploy **preview** và bình luận link preview vào PR.

Nếu thiếu secrets Vercel, bước deploy chỉ cảnh báo rồi bỏ qua. CI vẫn xanh.

### Cài đặt một lần (bạn tự làm)

1. **Liên kết Vercel project**: chạy `vercel link` ở thư mục gốc, chọn tạo project mới. Lệnh này tạo file
   `.vercel/project.json`, chứa `orgId` và `projectId`. File này đã được gitignore.
2. **Tạo token**: vào [vercel.com/account/tokens](https://vercel.com/account/tokens).
3. **Thêm GitHub Secrets**: vào repo → Settings → Secrets and variables → Actions → New repository secret:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`, lấy giá trị `orgId`
   - `VERCEL_PROJECT_ID`, lấy giá trị `projectId`
   - `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, cần từ ticket #4
4. **Thêm biến môi trường trên Vercel**: vào Project → Settings → Environment Variables, thêm
   `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` cho Production và Preview. `GEMINI_API_KEY` thì thêm
   sau, ở ticket #13.
5. **Bảo vệ nhánh `main`**: vào Settings → Branches → Add rule cho `main`, bật _Require status checks to pass_
   và chọn check **Lint · Test · Build**.
