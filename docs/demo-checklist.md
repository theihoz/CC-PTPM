# Checklist trước giờ demo

Website: https://cc-ptpm.vercel.app

## 1. Một ngày trước buổi demo

- [ ] **Supabase chưa bị tạm dừng.** Gói miễn phí tự tạm dừng project sau khoảng 7 ngày không ai truy cập. Vào Supabase Dashboard và mở project. Nếu thấy "Paused", bấm **Restore** rồi chờ vài phút.
- [ ] Mở website, thấy danh sách quán (không hiện "Không tải được thực đơn").
- [ ] Hỏi chatbot "món cay dưới 500 calo". Câu trả lời kèm thẻ món là Gemini đang chạy. Nếu Gemini lỗi, website tự chuyển sang Mock AI, nên phần demo vẫn chạy được.
- [ ] Chạy `supabase/tests/all_tests.sql` trong SQL Editor: đủ **33 dòng PASS**.
- [ ] Tab **Actions** trên GitHub: lần chạy gần nhất của `main` có màu xanh.
- [ ] Chuẩn bị sẵn 2 tài khoản demo do bạn tự tạo trên website: một tài khoản **khách hàng**, một tài khoản **chủ quán** (chưa đăng ký quán).
- [ ] Một đường dẫn ảnh `https://` để dán khi thêm món, ví dụ ảnh trên Unsplash.

## 2. Kịch bản demo (khoảng 10 phút)

### A. Khách vãng lai (chưa đăng nhập)

1. **Trang chủ:** danh mục, quán nổi bật, món nổi bật.
2. Bấm danh mục **Bún & Phở**. Danh sách quán đã được lọc sẵn và URL có `?category=bun-pho`. Thử tìm "phở", đổi cách sắp xếp, rồi tải lại trang: bộ lọc vẫn được giữ.
3. Mở **Phở Hà Thành**, rồi mở **Phở bò tái**. Chọn size Lớn, 2 topping, độ cay 3. Giá tạm tính đổi ngay theo lựa chọn.
4. Thêm vào giỏ. Thêm tiếp cùng món nhưng **khác size**, giỏ có **2 dòng riêng**. Thêm lại **y hệt** dòng đầu, dòng đó được **cộng dồn số lượng**.
5. Mở món sắp hết hàng (Bún bò Huế). Tăng số lượng đến hết tồn kho thì nút thêm bị khóa. Xóa dòng đó khỏi giỏ, số còn lại tăng trở lại.
6. Thêm một món của quán khác. Hộp thoại "Xóa giỏ hiện tại?" hiện ra. Chọn **Giữ giỏ hiện tại**.
7. Mở **Giỏ hàng**: tạm tính, phí ship 15.000đ (miễn phí từ 200.000đ), nhắc đơn tối thiểu 50.000đ.

### B. Khách hàng đặt và theo dõi đơn

8. Bấm **Đặt hàng**. Website chuyển sang đăng nhập, đăng nhập xong thì giỏ trên máy được gộp vào giỏ của tài khoản.
9. Điền thông tin giao hàng rồi xác nhận. Đơn có mã `FD-YYMMDD-NNNN`, thanh toán khi nhận hàng.
10. **Theo dõi đơn:** Đang chuẩn bị → Đang giao → Đã giao, trạng thái tự cập nhật theo thời gian.
11. Đặt thêm một đơn rồi **hủy** ngay khi còn Đang chuẩn bị. Mở lại món đó: tồn kho đã được hoàn lại.

### C. Chủ quán

12. Đăng nhập tài khoản chủ quán, bấm 🏪 **Quán của tôi** rồi **Đăng ký quán** (tên, địa chỉ, danh mục, giờ mở cửa). Quán hiện ngay trong danh sách quán.
13. Bấm **Thêm món**: điền tên, giá, tồn kho, dán ảnh (có xem trước), thêm 2 size, 1 topping, tag "cay", bật độ cay. Mở trang quán: khách đã thấy món mới.
14. Hỏi chatbot về món cay. Món mới có thể được gợi ý, vì AI đọc thực đơn trực tiếp từ database (cache khoảng 1 phút).
15. Sửa món và bỏ chọn **Đang bán**: món biến mất khỏi trang quán. Xóa một món: hộp xác nhận hiện ra.
16. Bỏ chọn **Đang mở bán** của quán (Tạm đóng): quán biến mất khỏi danh sách. Mở link trực tiếp thì thấy nhãn "Quán đang tạm đóng" và không thêm được món vào giỏ.

### D. CI/CD

17. Mở tab **Actions** trên GitHub. Workflow chạy lint → format → test → build → deploy. Một PR bất kỳ có bình luận link preview deploy.
18. Nếu giảng viên hỏi về bảo mật: API key Gemini nằm ở Vercel Function `/api/suggest`, không có trong mã nguồn frontend. Giá đơn hàng do server tính lại trong `place_order`. RLS bật trên mọi bảng.

## 3. Nếu có sự cố

| Sự cố                              | Cách xử lý                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Không tải được thực đơn"          | Supabase đang tạm dừng: vào Dashboard, bấm Restore, chờ 2–3 phút rồi tải lại trang.              |
| Chatbot trả lời chậm hoặc đơn giản | Gemini quá tải nên website đã tự chuyển sang Mock AI. Đây là tính năng dự phòng, cứ demo tiếp.   |
| Không đăng nhập được               | Kiểm tra Authentication → Email: phải tắt "Confirm email".                                       |
| Món hết hàng sau nhiều lần thử     | Chạy lại `supabase/seed.sql`. **Lưu ý:** seed xóa cả giỏ hàng, đơn hàng và quán do chủ quán tạo. |
