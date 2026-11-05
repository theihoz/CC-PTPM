# Bảng testcase

> File sinh tự động bằng `npm run docs:testcases` ngày 5/11/2026. Đừng sửa tay.

## 1. Tổng hợp

| Loại test           | Số testcase | Đạt | Không đạt | Cách chạy                                                  |
| ------------------- | ----------- | --- | --------- | ---------------------------------------------------------- |
| Unit test (Vitest)  | 218         | 218 | 0         | `npm test`, tự chạy trong CI ở mọi lần push                |
| Test SQL (Supabase) | 33          | 33  | 0         | Dán `supabase/tests/all_tests.sql` vào Supabase SQL Editor |

## 2. Unit test (Vitest)

Cột "Kết quả mong đợi" là tên của test case; test chỉ đạt khi mọi kiểm tra bên trong khớp đúng kết quả đó.

### Quy tắc nghiệp vụ (phí ship, đơn tối thiểu) (`tests/constants.test.js`)

| STT | Nhóm                  | Kết quả mong đợi                       | Kết quả |
| --- | --------------------- | -------------------------------------- | ------- |
| 1   | quy tắc phí giao hàng | dùng đúng các mức của spec             | ✅ Đạt  |
| 2   | quy tắc phí giao hàng | tính phí ship khi tạm tính dưới ngưỡng | ✅ Đạt  |
| 3   | quy tắc phí giao hàng | miễn phí ship từ đúng ngưỡng trở lên   | ✅ Đạt  |

### Định dạng tiền VND (`tests/format.test.js`)

| STT | Nhóm      | Kết quả mong đợi                                | Kết quả |
| --- | --------- | ----------------------------------------------- | ------- |
| 4   | formatVND | định dạng hàng nghìn bằng dấu chấm và ký hiệu ₫ | ✅ Đạt  |
| 5   | formatVND | hiển thị 0 ₫ cho số 0                           | ✅ Đạt  |

### Thực đơn: tìm kiếm, lọc, sắp xếp, giờ mở cửa, tồn kho (`tests/menu.test.js`)

| STT | Nhóm              | Kết quả mong đợi                                                | Kết quả |
| --- | ----------------- | --------------------------------------------------------------- | ------- |
| 6   | normalizeText     | bỏ dấu, đ → d, chữ thường, gộp khoảng trắng                     | ✅ Đạt  |
| 7   | normalizeMenu     | chuyển dữ liệu database thành đối tượng miền có size và topping | ✅ Đạt  |
| 8   | normalizeMenu     | bỏ món đã ngừng bán                                             | ✅ Đạt  |
| 9   | filterRestaurants | không có bộ lọc thì trả về mọi quán, sắp xếp theo đánh giá      | ✅ Đạt  |
| 10  | filterRestaurants | tìm theo tên quán, không phân biệt dấu và hoa thường            | ✅ Đạt  |
| 11  | filterRestaurants | tìm theo tên món                                                | ✅ Đạt  |
| 12  | filterRestaurants | lọc theo danh mục chính hoặc theo món thuộc danh mục            | ✅ Đạt  |
| 13  | filterRestaurants | kết hợp từ khóa và danh mục                                     | ✅ Đạt  |
| 14  | filterRestaurants | danh mục không tồn tại thì không có kết quả                     | ✅ Đạt  |
| 15  | filterRestaurants | sắp xếp theo giao nhanh và theo tên                             | ✅ Đạt  |
| 16  | filterRestaurants | giá trị sort lạ rơi về mặc định                                 | ✅ Đạt  |
| 17  | filterRestaurants | liệt kê tên món khớp từ khóa                                    | ✅ Đạt  |
| 18  | isOpenAt          | mở trong khung giờ, đóng ngoài khung giờ (giờ Việt Nam)         | ✅ Đạt  |
| 19  | isOpenAt          | hỗ trợ quán mở qua nửa đêm                                      | ✅ Đạt  |
| 20  | stockStatus       | phân loại hết, sắp hết, còn hàng                                | ✅ Đạt  |
| 21  | dữ liệu mẫu       | đủ quy mô và có món để demo tồn kho                             | ✅ Đạt  |
| 22  | dữ liệu mẫu       | mỗi món có size thì có đúng một size mặc định                   | ✅ Đạt  |

### Pinia: menu store (`tests/menuStore.test.js`)

| STT | Nhóm       | Kết quả mong đợi                           | Kết quả |
| --- | ---------- | ------------------------------------------ | ------- |
| 23  | menu store | tải thực đơn và cung cấp quán, món nổi bật | ✅ Đạt  |
| 24  | menu store | chỉ gọi API một lần dù load nhiều lần      | ✅ Đạt  |
| 25  | menu store | báo lỗi rồi thử lại thành công             | ✅ Đạt  |
| 26  | menu store | tìm kiếm qua store                         | ✅ Đạt  |

### Danh sách quán: bộ lọc trên URL (`tests/restaurantsView.test.js`)

| STT | Nhóm                 | Kết quả mong đợi                           | Kết quả |
| --- | -------------------- | ------------------------------------------ | ------- |
| 27  | trang danh sách quán | đọc bộ lọc từ URL                          | ✅ Đạt  |
| 28  | trang danh sách quán | gõ từ khóa thì lọc và ghi vào URL          | ✅ Đạt  |
| 29  | trang danh sách quán | hiện trạng thái rỗng và xóa được bộ lọc    | ✅ Đạt  |
| 30  | trang danh sách quán | hiện lỗi và nút thử lại khi không tải được | ✅ Đạt  |

### Chi tiết quán và chi tiết món (`tests/detailPages.test.js`)

| STT | Nhóm                | Kết quả mong đợi                                     | Kết quả |
| --- | ------------------- | ---------------------------------------------------- | ------- |
| 31  | trang chi tiết quán | hiển thị thông tin và thực đơn chia nhóm             | ✅ Đạt  |
| 32  | trang chi tiết quán | quán không tồn tại thì báo 404                       | ✅ Đạt  |
| 33  | trang chi tiết món  | hiển thị ảnh, mô tả, calo, tag và giá gốc            | ✅ Đạt  |
| 34  | trang chi tiết món  | giá tạm tính cập nhật theo size, topping và số lượng | ✅ Đạt  |
| 35  | trang chi tiết món  | chỉ món có độ cay mới hiện chọn độ cay               | ✅ Đạt  |
| 36  | trang chi tiết món  | món hết hàng: nhãn Hết món và nút bị vô hiệu         | ✅ Đạt  |
| 37  | trang chi tiết món  | món sắp hết: nhãn Sắp hết và không tăng quá tồn kho  | ✅ Đạt  |
| 38  | trang chi tiết món  | món không thuộc quán trên URL thì báo 404            | ✅ Đạt  |
| 39  | trang chi tiết món  | món không tồn tại thì báo 404                        | ✅ Đạt  |

### Tính giá món theo size, topping, số lượng (`tests/pricing.test.js`)

| STT | Nhóm                   | Kết quả mong đợi                                      | Kết quả |
| --- | ---------------------- | ----------------------------------------------------- | ------- |
| 40  | defaultSelection       | chọn size mặc định, không topping, không cay, 1 phần  | ✅ Đạt  |
| 41  | defaultSelection       | món không có size thì sizeId là null                  | ✅ Đạt  |
| 42  | unitPrice và lineTotal | giá gốc khi chọn size mặc định                        | ✅ Đạt  |
| 43  | unitPrice và lineTotal | cộng phụ thu size và tổng topping                     | ✅ Đạt  |
| 44  | unitPrice và lineTotal | độ cay không làm đổi giá                              | ✅ Đạt  |
| 45  | unitPrice và lineTotal | nhân số lượng                                         | ✅ Đạt  |
| 46  | unitPrice và lineTotal | bỏ qua size, topping không thuộc món và topping trùng | ✅ Đạt  |
| 47  | unitPrice và lineTotal | món không size, không topping chỉ có giá gốc          | ✅ Đạt  |
| 48  | normalizeToppingIds    | sắp xếp tăng dần để thứ tự chọn không ảnh hưởng       | ✅ Đạt  |
| 49  | clampQuantity          | giữ trong khoảng 1..max                               | ✅ Đạt  |
| 50  | clampQuantity          | hết hàng thì là 0                                     | ✅ Đạt  |
| 51  | normalizeSpice         | món không cay luôn là 0                               | ✅ Đạt  |
| 52  | normalizeSpice         | món cay chỉ nhận 0–4                                  | ✅ Đạt  |

### Pinia: giỏ hàng (`tests/cartStore.test.js`)

| STT | Nhóm                      | Kết quả mong đợi                                                          | Kết quả |
| --- | ------------------------- | ------------------------------------------------------------------------- | ------- |
| 53  | tách và gộp dòng          | cùng món khác size, topping hoặc độ cay là các dòng riêng                 | ✅ Đạt  |
| 54  | tách và gộp dòng          | giống hệt thì cộng dồn vào dòng cũ                                        | ✅ Đạt  |
| 55  | tách và gộp dòng          | thứ tự chọn topping khác nhau vẫn là cùng một dòng                        | ✅ Đạt  |
| 56  | tách và gộp dòng          | không chọn size thì dùng size mặc định và gộp với dòng chọn size mặc định | ✅ Đạt  |
| 57  | tách và gộp dòng          | độ cay của món không cay luôn về 0                                        | ✅ Đạt  |
| 58  | tách và gộp dòng          | từ chối size không thuộc món, món không tồn tại và số lượng không hợp lệ  | ✅ Đạt  |
| 59  | tính giá                  | đơn giá và thành tiền theo size, topping và số lượng                      | ✅ Đạt  |
| 60  | tính giá                  | đổi số lượng thì thành tiền và tổng tự tính lại                           | ✅ Đạt  |
| 61  | tồn kho                   | remainingStock trừ mọi dòng cùng món, kể cả khác size                     | ✅ Đạt  |
| 62  | tồn kho                   | chặn thêm vượt kho và báo số còn lại                                      | ✅ Đạt  |
| 63  | tồn kho                   | món hết hàng không thêm được                                              | ✅ Đạt  |
| 64  | tồn kho                   | tăng vượt kho thì giữ ở mức tối đa                                        | ✅ Đạt  |
| 65  | tồn kho                   | giảm hoặc xóa thì remainingStock tăng lại                                 | ✅ Đạt  |
| 66  | tồn kho                   | đặt số lượng 0 thì xóa dòng                                               | ✅ Đạt  |
| 67  | phí ship và đơn tối thiểu | ngưỡng miễn phí ship 199.999 / 200.000                                    | ✅ Đạt  |
| 68  | phí ship và đơn tối thiểu | ngưỡng đơn tối thiểu 50.000                                               | ✅ Đạt  |
| 69  | phí ship và đơn tối thiểu | giỏ trống không tính phí ship                                             | ✅ Đạt  |
| 70  | phí ship và đơn tối thiểu | trong giỏ: 150.000 tính ship, 200.000 miễn ship                           | ✅ Đạt  |
| 71  | phí ship và đơn tối thiểu | trong giỏ: dưới tối thiểu thì báo số tiền còn thiếu                       | ✅ Đạt  |
| 72  | một giỏ một quán          | thêm món quán khác thì cần xác nhận và không đổi giỏ                      | ✅ Đạt  |
| 73  | một giỏ một quán          | xác nhận đổi quán thì giỏ chỉ còn món mới                                 | ✅ Đạt  |
| 74  | một giỏ một quán          | đổi quán thất bại thì giữ nguyên giỏ cũ                                   | ✅ Đạt  |
| 75  | một giỏ một quán          | xóa hết giỏ thì thêm được món quán khác                                   | ✅ Đạt  |
| 76  | lưu và khôi phục          | mỗi thay đổi đều được lưu qua repository                                  | ✅ Đạt  |
| 77  | lưu và khôi phục          | khôi phục giỏ đã lưu khi khởi tạo lại                                     | ✅ Đạt  |
| 78  | lưu và khôi phục          | LocalStorage repository lưu, đọc lại và bỏ dữ liệu hỏng                   | ✅ Đạt  |

### Đồng bộ và gộp giỏ khi đăng nhập (`tests/cartSync.test.js`)

| STT | Nhóm                               | Kết quả mong đợi                                                | Kết quả |
| --- | ---------------------------------- | --------------------------------------------------------------- | ------- |
| 79  | mergeCarts                         | một bên trống thì lấy bên còn lại                               | ✅ Đạt  |
| 80  | mergeCarts                         | cùng quán: dòng trùng cộng dồn, dòng khác giữ riêng             | ✅ Đạt  |
| 81  | mergeCarts                         | topping khác thứ tự vẫn là cùng một dòng khi gộp                | ✅ Đạt  |
| 82  | mergeCarts                         | cắt tại tồn kho, ưu tiên phần đã có trong tài khoản             | ✅ Đạt  |
| 83  | mergeCarts                         | khác quán thì báo xung đột, không tự gộp                        | ✅ Đạt  |
| 84  | mergeCarts                         | capToStock bỏ dòng về 0 và trả giỏ trống nếu hết                | ✅ Đạt  |
| 85  | cart store khi đăng nhập/đăng xuất | gộp giỏ trên máy vào tài khoản và lưu lên tài khoản             | ✅ Đạt  |
| 86  | cart store khi đăng nhập/đăng xuất | giỏ trên máy trống thì chỉ nạp giỏ tài khoản, không ghi lại     | ✅ Đạt  |
| 87  | cart store khi đăng nhập/đăng xuất | khác quán: hiện giỏ tài khoản, chờ khách chọn giữ giỏ trên máy  | ✅ Đạt  |
| 88  | cart store khi đăng nhập/đăng xuất | khác quán: chọn giữ giỏ tài khoản thì không ghi gì              | ✅ Đạt  |
| 89  | cart store khi đăng nhập/đăng xuất | thực đơn chưa tải được thì không xóa nhầm giỏ khi gộp           | ✅ Đạt  |
| 90  | cart store khi đăng nhập/đăng xuất | đăng xuất: giỏ hiển thị trống, giỏ tài khoản giữ nguyên         | ✅ Đạt  |
| 91  | setupCartSync                      | khách vãng lai: dùng giỏ trên máy                               | ✅ Đạt  |
| 92  | setupCartSync                      | đã đăng nhập sẵn: chuyển sang giỏ tài khoản và xóa giỏ trên máy | ✅ Đạt  |
| 93  | setupCartSync                      | đăng nhập rồi đăng xuất                                         | ✅ Đạt  |
| 94  | Supabase cart repository           | đọc cart_items thành trạng thái giỏ                             | ✅ Đạt  |
| 95  | Supabase cart repository           | lưu liên tiếp: một request mỗi lúc, chỉ gửi trạng thái mới nhất | ✅ Đạt  |
| 96  | Supabase cart repository           | báo lỗi khi RPC lỗi                                             | ✅ Đạt  |

### Kiểm tra dữ liệu form (`tests/validation.test.js`)

| STT | Nhóm             | Kết quả mong đợi                                                | Kết quả |
| --- | ---------------- | --------------------------------------------------------------- | ------- |
| 97  | kiểm tra form    | email                                                           | ✅ Đạt  |
| 98  | kiểm tra form    | mật khẩu: ít nhất 8 ký tự, có chữ và số                         | ✅ Đạt  |
| 99  | kiểm tra form    | họ tên                                                          | ✅ Đạt  |
| 100 | kiểm tra form    | số điện thoại Việt Nam, chấp nhận khoảng trắng, dấu chấm và +84 | ✅ Đạt  |
| 101 | safeRedirect     | chỉ cho phép đường dẫn nội bộ                                   | ✅ Đạt  |
| 102 | safeRedirect     | không quay lại trang đăng nhập hay đăng ký                      | ✅ Đạt  |
| 103 | authErrorMessage | dịch các lỗi thường gặp sang tiếng Việt                         | ✅ Đạt  |

### Đăng ký, đăng nhập, route guard (`tests/authStore.test.js`)

| STT | Nhóm                          | Kết quả mong đợi                                                     | Kết quả |
| --- | ----------------------------- | -------------------------------------------------------------------- | ------- |
| 104 | khôi phục phiên               | chưa đăng nhập                                                       | ✅ Đạt  |
| 105 | khôi phục phiên               | giữ đăng nhập khi tải lại trang và nạp hồ sơ                         | ✅ Đạt  |
| 106 | khôi phục phiên               | init gọi nhiều lần chỉ chạy một lần                                  | ✅ Đạt  |
| 107 | đăng nhập, đăng ký, đăng xuất | đăng nhập thành công phát tín hiệu cho phần khác của app             | ✅ Đạt  |
| 108 | đăng nhập, đăng ký, đăng xuất | sai mật khẩu trả về thông báo tiếng Việt                             | ✅ Đạt  |
| 109 | đăng nhập, đăng ký, đăng xuất | đăng ký gửi họ tên và số điện thoại đã chuẩn hóa, rồi đăng nhập luôn | ✅ Đạt  |
| 110 | đăng nhập, đăng ký, đăng xuất | email đã tồn tại báo lỗi tiếng Việt                                  | ✅ Đạt  |
| 111 | đăng nhập, đăng ký, đăng xuất | project còn bật xác nhận email thì báo cần xác nhận                  | ✅ Đạt  |
| 112 | đăng nhập, đăng ký, đăng xuất | đăng xuất xóa phiên, hồ sơ và phát tín hiệu, kể cả khi máy chủ lỗi   | ✅ Đạt  |
| 113 | đăng nhập, đăng ký, đăng xuất | làm mới token cùng người dùng không phát lại tín hiệu đăng nhập      | ✅ Đạt  |
| 114 | đăng nhập, đăng ký, đăng xuất | cập nhật hồ sơ                                                       | ✅ Đạt  |
| 115 | route guard                   | trang cần đăng nhập chuyển sang /login kèm redirect                  | ✅ Đạt  |
| 116 | route guard                   | đã đăng nhập thì vào được trang cần đăng nhập                        | ✅ Đạt  |
| 117 | route guard                   | đã đăng nhập mà mở /login thì về trang redirect                      | ✅ Đạt  |
| 118 | route guard                   | trang công khai không cần chờ đăng nhập                              | ✅ Đạt  |

### Đặt hàng (`tests/orders.test.js`)

| STT | Nhóm                   | Kết quả mong đợi                                                    | Kết quả |
| --- | ---------------------- | ------------------------------------------------------------------- | ------- |
| 119 | validateDelivery       | báo lỗi từng trường, rỗng khi hợp lệ                                | ✅ Đạt  |
| 120 | thông báo lỗi đặt hàng | dịch mã lỗi của place_order                                         | ✅ Đạt  |
| 121 | thông báo lỗi đặt hàng | mô tả món thiếu hàng                                                | ✅ Đạt  |
| 122 | orderApi.placeOrder    | gọi RPC place_order và trả về đơn                                   | ✅ Đạt  |
| 123 | orderApi.placeOrder    | đọc danh sách món thiếu hàng từ details                             | ✅ Đạt  |
| 124 | orderApi.placeOrder    | lỗi lạ coi như lỗi mạng                                             | ✅ Đạt  |
| 125 | orders store           | chỉ gửi lựa chọn (không có giá) và thông tin giao hàng đã chuẩn hóa | ✅ Đạt  |
| 126 | orders store           | thành công thì giỏ trống và tải lại thực đơn (tồn kho đã đổi)       | ✅ Đạt  |
| 127 | orders store           | thiếu hàng: giữ giỏ, trả về món thiếu và thông báo tiếng Việt       | ✅ Đạt  |
| 128 | orders store           | không gửi hai lần khi đang đặt                                      | ✅ Đạt  |
| 129 | hủy đơn                | gọi RPC cancel_order với id đơn                                     | ✅ Đạt  |
| 130 | hủy đơn                | đọc mã lỗi nghiệp vụ, lỗi lạ coi như lỗi mạng                       | ✅ Đạt  |
| 131 | hủy đơn                | store: thành công trả về thời điểm hủy và tải lại tồn kho           | ✅ Đạt  |
| 132 | hủy đơn                | store: quá giờ thì báo lỗi tiếng Việt                               | ✅ Đạt  |

### Trạng thái đơn và hủy đơn (`tests/orderStatus.test.js`)

| STT | Nhóm            | Kết quả mong đợi                                              | Kết quả |
| --- | --------------- | ------------------------------------------------------------- | ------- |
| 133 | orderStatus     | 0 giây: đang chuẩn bị, hủy được                               | ✅ Đạt  |
| 134 | orderStatus     | 29 giây: vẫn đang chuẩn bị                                    | ✅ Đạt  |
| 135 | orderStatus     | 30 giây: chuyển sang đang giao, không hủy được nữa            | ✅ Đạt  |
| 136 | orderStatus     | 89 giây: vẫn đang giao                                        | ✅ Đạt  |
| 137 | orderStatus     | 90 giây trở đi: đã giao                                       | ✅ Đạt  |
| 138 | orderStatus     | đơn đã hủy luôn là cancelled, kể cả khi còn trong 30 giây đầu | ✅ Đạt  |
| 139 | orderStatus     | đồng hồ máy khách lệch về trước giờ đặt thì coi như vừa đặt   | ✅ Đạt  |
| 140 | orderStatus     | nhận now dạng số mili giây                                    | ✅ Đạt  |
| 141 | formatRemaining | làm tròn lên theo giây                                        | ✅ Đạt  |

### AI gợi ý món: Mock AI, AI service, chatbot (`tests/ai.test.js`)

| STT | Nhóm              | Kết quả mong đợi                                              | Kết quả |
| --- | ----------------- | ------------------------------------------------------------- | ------- |
| 142 | parsePreferences  | nhận ra cay, không cay, chay, ít calo                         | ✅ Đạt  |
| 143 | parsePreferences  | đọc mức calo tối đa                                           | ✅ Đạt  |
| 144 | parsePreferences  | đọc mức giá tối đa                                            | ✅ Đạt  |
| 145 | parsePreferences  | nhận ra danh mục và câu chào                                  | ✅ Đạt  |
| 146 | Mock AI gợi ý món | cay: món cay sẵn hoặc chọn được độ cay                        | ✅ Đạt  |
| 147 | Mock AI gợi ý món | không cay: không có món mang tag cay                          | ✅ Đạt  |
| 148 | Mock AI gợi ý món | chay: chỉ món chay                                            | ✅ Đạt  |
| 149 | Mock AI gợi ý món | ít calo: chỉ món ít calo                                      | ✅ Đạt  |
| 150 | Mock AI gợi ý món | dưới N calo là điều kiện cứng                                 | ✅ Đạt  |
| 151 | Mock AI gợi ý món | đồ uống, đồ ngọt, tên món                                     | ✅ Đạt  |
| 152 | Mock AI gợi ý món | không bao giờ gợi ý món hết hàng                              | ✅ Đạt  |
| 153 | Mock AI gợi ý món | luôn trả id có thật, tối đa vài món, câu trả lời tiếng Việt   | ✅ Đạt  |
| 154 | Mock AI gợi ý món | không có món phù hợp thì nói rõ và không gợi ý bừa            | ✅ Đạt  |
| 155 | Mock AI gợi ý món | recommend lọc theo giá                                        | ✅ Đạt  |
| 156 | AI service        | không có transport thì dùng Mock                              | ✅ Đạt  |
| 157 | AI service        | dùng câu trả lời của AI thật, bỏ id không tồn tại và id trùng | ✅ Đạt  |
| 158 | AI service        | transport lỗi thì chuyển sang Mock                            | ✅ Đạt  |
| 159 | AI service        | phản hồi sai cấu trúc thì chuyển sang Mock                    | ✅ Đạt  |
| 160 | AI service        | quá thời gian thì hủy request và chuyển sang Mock             | ✅ Đạt  |
| 161 | AI service        | bị giới hạn số lần hỏi thì báo khách                          | ✅ Đạt  |
| 162 | AI service        | cắt câu hỏi quá dài                                           | ✅ Đạt  |
| 163 | chat store        | gửi câu hỏi, nhận câu trả lời kèm id món, giữ lịch sử         | ✅ Đạt  |
| 164 | chat store        | gửi lịch sử các lượt trước cho AI                             | ✅ Đạt  |
| 165 | chat store        | bỏ qua tin rỗng và không gửi chồng khi đang suy nghĩ          | ✅ Đạt  |
| 166 | chat store        | lỗi bất ngờ vẫn trả lời khách                                 | ✅ Đạt  |

### Vercel Function /api/suggest (Gemini) (`tests/suggestFunction.test.js`)

| STT | Nhóm                            | Kết quả mong đợi                                                                   | Kết quả |
| --- | ------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| 167 | POST /api/suggest               | trả lời bằng Gemini, chỉ giữ id có trong thực đơn                                  | ✅ Đạt  |
| 168 | POST /api/suggest               | gửi đúng request tới Gemini: key ở header, model, schema JSON, không lưu hội thoại | ✅ Đạt  |
| 169 | POST /api/suggest               | cắt khoảng trắng, xuống dòng, dấu nháy dính vào key và model khi dán               | ✅ Đạt  |
| 170 | POST /api/suggest               | model mặc định là bản Flash ổn định, thinking ở mức thấp                           | ✅ Đạt  |
| 171 | POST /api/suggest               | một model quá thời gian thì thử model sau                                          | ✅ Đạt  |
| 172 | POST /api/suggest               | chỉ nhận POST                                                                      | ✅ Đạt  |
| 173 | POST /api/suggest               | body sai hoặc tin nhắn rỗng thì 400                                                | ✅ Đạt  |
| 174 | POST /api/suggest               | thiếu GEMINI_API_KEY thì 503 và không gọi Gemini                                   | ✅ Đạt  |
| 175 | POST /api/suggest               | Gemini lỗi, quá thời gian hoặc trả sai cấu trúc thì 5xx                            | ✅ Đạt  |
| 176 | POST /api/suggest               | mọi model đều hết lượt thì 429                                                     | ✅ Đạt  |
| 177 | POST /api/suggest               | model chính quá tải thì tự thử model dự phòng                                      | ✅ Đạt  |
| 178 | POST /api/suggest               | lỗi không nên thử lại (400, key sai) thì dừng ngay                                 | ✅ Đạt  |
| 179 | POST /api/suggest               | GEMINI_MODEL nhận danh sách model                                                  | ✅ Đạt  |
| 180 | POST /api/suggest               | không đọc được thực đơn thì 503                                                    | ✅ Đạt  |
| 181 | POST /api/suggest               | giới hạn số lần gọi theo IP, có Retry-After                                        | ✅ Đạt  |
| 182 | POST /api/suggest               | cache thực đơn giữa các request                                                    | ✅ Đạt  |
| 183 | các hàm phụ của Function        | parseBody cắt tin dài, lọc lịch sử sai, giữ tối đa 6 lượt                          | ✅ Đạt  |
| 184 | các hàm phụ của Function        | extractText đọc output_text hoặc steps                                             | ✅ Đạt  |
| 185 | các hàm phụ của Function        | system instruction chỉ chứa thực đơn và quy tắc chỉ chọn món có thật               | ✅ Đạt  |
| 186 | các hàm phụ của Function        | rate limiter mở lại sau khi hết cửa sổ thời gian                                   | ✅ Đạt  |
| 187 | HTTP transport phía trình duyệt | POST tới /api/suggest và trả về JSON                                               | ✅ Đạt  |
| 188 | HTTP transport phía trình duyệt | 429 thành rate_limited kèm Retry-After                                             | ✅ Đạt  |
| 189 | HTTP transport phía trình duyệt | 404 (npm run dev), 5xx và lỗi mạng thành unavailable                               | ✅ Đạt  |
| 190 | HTTP transport phía trình duyệt | JSON hỏng thành invalid_response                                                   | ✅ Đạt  |

### Chủ quán: đăng ký quán, Tạm đóng (`tests/myRestaurant.test.js`)

| STT | Nhóm                | Kết quả mong đợi                                                                     | Kết quả |
| --- | ------------------- | ------------------------------------------------------------------------------------ | ------- |
| 191 | slugify             | bỏ dấu tiếng Việt, chữ thường, nối bằng gạch ngang                                   | ✅ Đạt  |
| 192 | slugify             | tên không có chữ hay số thì dùng "quan"; tối đa 60 ký tự, không kết thúc bằng gạch   | ✅ Đạt  |
| 193 | validateRestaurant  | hợp lệ với form đầy đủ                                                               | ✅ Đạt  |
| 194 | validateRestaurant  | báo lỗi từng trường                                                                  | ✅ Đạt  |
| 195 | validateRestaurant  | ảnh được để trống, nhưng không nhận javascript: hay URL quá dài                      | ✅ Đạt  |
| 196 | my restaurant store | chưa có quán thì restaurant là null                                                  | ✅ Đạt  |
| 197 | my restaurant store | đăng ký quán: gửi slug sinh từ tên, không gửi rating hay owner, rồi tải lại thực đơn | ✅ Đạt  |
| 198 | my restaurant store | lỗi từ máy chủ thành thông báo tiếng Việt                                            | ✅ Đạt  |
| 199 | Tạm đóng            | quán Tạm đóng ẩn khỏi danh sách, nổi bật và gợi ý AI nhưng vẫn mở được bằng id       | ✅ Đạt  |
| 200 | Tạm đóng            | dữ liệu cũ không có is_open thì coi như đang mở bán                                  | ✅ Đạt  |
| 201 | Tạm đóng            | đặt đơn ở quán Tạm đóng có thông báo riêng                                           | ✅ Đạt  |

### Chủ quán: thêm, sửa, xóa món (`tests/ownerFoods.test.js`)

| STT | Nhóm                                | Kết quả mong đợi                                                                       | Kết quả |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------- | ------- |
| 202 | validateFood                        | form đầy đủ là hợp lệ; calo và phụ thu để trống tính là 0                              | ✅ Đạt  |
| 203 | validateFood                        | báo lỗi giá, tồn kho âm, tên dài, danh mục lạ                                          | ✅ Đạt  |
| 204 | validateFood                        | size: không trùng tên (không phân biệt hoa thường), đúng một mặc định, có tên          | ✅ Đạt  |
| 205 | toFoodPayload và foodToForm         | payload chỉ gồm số và chuỗi đã cắt khoảng trắng; tag bỏ trùng, sắp xếp; giữ id size cũ | ✅ Đạt  |
| 206 | toFoodPayload và foodToForm         | sửa món: form từ món cũ lưu lại ra đúng payload có id                                  | ✅ Đạt  |
| 207 | my restaurant store: món            | lưu món gọi save_food, tải lại danh sách món và thực đơn                               | ✅ Đạt  |
| 208 | my restaurant store: món            | xóa món gọi delete_food với đúng id rồi bỏ món khỏi danh sách                          | ✅ Đạt  |
| 209 | my restaurant store: món            | lỗi máy chủ thành thông báo tiếng Việt                                                 | ✅ Đạt  |
| 210 | AI: tên do quán nhập chỉ là dữ liệu | bỏ xuống dòng và dấu \| để không chèn được dòng thực đơn hay quy tắc giả               | ✅ Đạt  |

### Vue Router: route, tiêu đề trang (`tests/router.test.js`)

| STT | Nhóm   | Kết quả mong đợi                                     | Kết quả |
| --- | ------ | ---------------------------------------------------- | ------- |
| 211 | router | hiển thị trang chủ với danh mục, quán và món nổi bật | ✅ Đạt  |
| 212 | router | danh mục ở trang chủ dẫn tới danh sách quán đã lọc   | ✅ Đạt  |
| 213 | router | hiển thị trang 404 cho đường dẫn không tồn tại       | ✅ Đạt  |
| 214 | router | id quán không phải số thì là 404                     | ✅ Đạt  |
| 215 | router | tạo tiêu đề tab từ meta.title                        | ✅ Đạt  |

### Thẻ meta cho SEO (`tests/head.test.js`)

| STT | Nhóm           | Kết quả mong đợi                                         | Kết quả |
| --- | -------------- | -------------------------------------------------------- | ------- |
| 216 | setPageHead    | đặt tiêu đề tab và meta description                      | ✅ Đạt  |
| 217 | setPageHead    | không có mô tả thì dùng mô tả mặc định, chỉ một thẻ meta | ✅ Đạt  |
| 218 | meta của route | mọi route đều có tiêu đề và mô tả                        | ✅ Đạt  |

## 3. Test SQL trên Supabase

Mỗi kịch bản chạy trong `BEGIN … ROLLBACK` trên database production nên không để lại dữ liệu. Kết quả lần chạy gần nhất: 33/33 `PASS`.

| #   | Phần     | Kết quả mong đợi                                                                                                                                                          | Kết quả |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1.1 | RLS      | Trigger tạo hồ sơ: tên được cắt khoảng trắng, số điện thoại `090 123 4567` thành `0901234567`, số sai định dạng bị bỏ                                                     | ✅ Đạt  |
| 1.2 | RLS      | Người đã đăng nhập đọc được thực đơn, nhưng sửa tồn kho hay thêm danh mục đều bị từ chối                                                                                  | ✅ Đạt  |
| 1.3 | RLS      | A chỉ thấy hồ sơ của mình, không sửa được tên của B, không đổi được `id`, không lưu được số điện thoại sai                                                                | ✅ Đạt  |
| 1.4 | RLS      | `replace_cart` gộp hai dòng có topping khác thứ tự thành một dòng số lượng 5. Topping chưa sắp xếp bị CHECK chặn. Không thêm được dòng vào giỏ của người khác             | ✅ Đạt  |
| 1.5 | RLS      | B không thấy giỏ và hồ sơ của A                                                                                                                                           | ✅ Đạt  |
| 1.6 | RLS      | `anon` đọc được thực đơn, nhưng không đọc được hồ sơ và không gọi được `replace_cart`                                                                                     | ✅ Đạt  |
| 2.1 | Đặt hàng | **Đặt quá kho** (4 phần Bún bò Huế, kho còn 3) bị từ chối với `out_of_stock`, `detail` chỉ đúng món, **kho không đổi**                                                    | ✅ Đạt  |
| 2.2 | Đặt hàng | **Giá giả** (`unitPrice: 1`, `total: 1`) bị bỏ qua: tổng tính đúng 70.000 + 15.000 = 85.000đ. Mã đơn đúng dạng, kho giảm 1, giỏ được xóa, địa chỉ được lưu, bản chụp đúng | ✅ Đạt  |
| 2.3 | Đặt hàng | **Size hoặc topping không thuộc món** bị từ chối với `invalid_item`                                                                                                       | ✅ Đạt  |
| 2.4 | Đặt hàng | **Đơn dưới tối thiểu** (35.000đ) bị từ chối với `below_minimum`                                                                                                           | ✅ Đạt  |
| 2.5 | Đặt hàng | Đơn trộn món của hai quán bị từ chối với `mixed_restaurants`                                                                                                              | ✅ Đạt  |
| 2.6 | Đặt hàng | `INSERT` và `UPDATE` trực tiếp vào `orders` bị từ chối (`insufficient_privilege`)                                                                                         | ✅ Đạt  |
| 2.7 | Đặt hàng | Thông tin giao hàng sai bị từ chối với `invalid_delivery`                                                                                                                 | ✅ Đạt  |
| 2.8 | Đặt hàng | **Truy cập chéo tài khoản**: B không đọc được đơn và món trong đơn của A                                                                                                  | ✅ Đạt  |
| 2.9 | Đặt hàng | `anon` không gọi được `place_order`                                                                                                                                       | ✅ Đạt  |
| 3.1 | Hủy đơn  | **Hủy đơn đang chuẩn bị**: `cancelled_at` được gán và **kho được hoàn đúng 2 phần**                                                                                       | ✅ Đạt  |
| 3.2 | Hủy đơn  | Hủy lần hai bị từ chối với `already_cancelled`, kho không bị cộng thêm                                                                                                    | ✅ Đạt  |
| 3.3 | Hủy đơn  | Đơn đặt từ 1 phút trước bị từ chối với `too_late`                                                                                                                         | ✅ Đạt  |
| 3.4 | Hủy đơn  | Đơn không tồn tại bị từ chối với `order_not_found`                                                                                                                        | ✅ Đạt  |
| 3.5 | Hủy đơn  | **B không hủy được đơn của A**: lỗi `order_not_found`                                                                                                                     | ✅ Đạt  |
| 3.6 | Hủy đơn  | `anon` không gọi được `cancel_order`                                                                                                                                      | ✅ Đạt  |
| 4.1 | Chủ quán | Đăng ký quán: `my_restaurant()` thấy quán vừa tạo; slug trùng với quán có sẵn thì tự thêm `-2`                                                                            | ✅ Đạt  |
| 4.2 | Chủ quán | Lưu lần hai là sửa quán cũ, không tạo quán thứ hai, slug giữ nguyên                                                                                                       | ✅ Đạt  |
| 4.3 | Chủ quán | Tên quá dài, danh mục không tồn tại, ảnh `javascript:`, giờ sai đều bị từ chối với `invalid_restaurant`                                                                   | ✅ Đạt  |
| 4.4 | Chủ quán | Không tự sửa được rating; không đọc được `owner_id`                                                                                                                       | ✅ Đạt  |
| 4.5 | Chủ quán | **Chủ quán B không thấy, không sửa được quán của A**                                                                                                                      | ✅ Đạt  |
| 4.6 | Chủ quán | **Quán Tạm đóng không nhận đơn** (`restaurant_closed`) và không bị trừ kho                                                                                                | ✅ Đạt  |
| 5.1 | Món      | Thêm món kèm 2 size và 1 topping trong một lần lưu; `my_foods()` thấy món                                                                                                 | ✅ Đạt  |
| 5.2 | Món      | Sửa món: **giữ nguyên id size cũ** (dòng giỏ hàng của khách không mất), bỏ size, thêm size mặc định mới, bỏ topping, Ngừng bán; chủ quán vẫn thấy món Ngừng bán           | ✅ Đạt  |
| 5.3 | Món      | Giá hoặc tồn kho âm, tên dài, tag lạ, ảnh `javascript:`, size trùng tên hoặc không có size mặc định đều bị từ chối với `invalid_food`                                     | ✅ Đạt  |
| 5.4 | Món      | **Không sửa, không xóa được món của quán khác** (`food_not_found`), không mượn được id size của món khác, không ghi thẳng bảng `foods`                                    | ✅ Đạt  |
| 5.5 | Món      | Người chưa có quán không thêm được món (`no_restaurant`), không thấy và không xóa được món của A                                                                          | ✅ Đạt  |
| 5.6 | Món      | Chủ quán xóa được món của mình; size và topping của món bị xóa theo                                                                                                       | ✅ Đạt  |
