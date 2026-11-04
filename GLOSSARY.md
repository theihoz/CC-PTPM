# FoodieGo

Website đặt món và giao đồ ăn: khách tìm quán, tùy chỉnh món, đặt đơn và theo dõi đơn; AI gợi ý món theo khẩu vị và calo.

## Người dùng

**Khách hàng**:
Người dùng đã có tài khoản và đặt đơn.
_Avoid_: user, người mua, buyer

**Khách vãng lai**:
Người dùng chưa đăng nhập; được duyệt thực đơn, có giỏ hàng và chat với AI nhưng chưa đặt đơn được.
_Avoid_: guest, khách lạ

**Chủ quán**:
Khách hàng đã đăng ký một quán và tự quản lý thông tin quán cùng thực đơn của quán đó. Mỗi tài khoản có tối đa một quán.
_Avoid_: người bán, seller, shop owner, merchant

## Thực đơn

**Quán**:
Nơi bán món; mỗi quán có thực đơn, địa chỉ, giờ mở cửa và đánh giá.
_Avoid_: nhà hàng, cửa hàng, shop

**Tạm đóng**:
Trạng thái do chủ quán bật: quán không nhận đơn mới. Quán không bao giờ bị xóa, chỉ bị tạm đóng.
_Avoid_: xóa quán, đóng cửa

**Danh mục**:
Nhóm loại đồ ăn (Bún & Phở, Cơm, Đồ uống…) dùng để lọc quán và món.
_Avoid_: category, loại

**Món**:
Một mục trong thực đơn của đúng một quán, có giá gốc, calo, tag khẩu vị và tồn kho.
_Avoid_: sản phẩm, product, item

**Size**:
Phần ăn của một món; mỗi món chọn đúng một size, mỗi size có phụ thu riêng.

**Topping**:
Phần thêm tùy chọn của một món, chọn được nhiều, mỗi topping có giá.

**Độ cay**:
Mức cay 0–4, chỉ có ở món hỗ trợ cay.

**Tồn kho**:
Số phần còn bán được của một món, không tách theo size.
_Avoid_: số lượng, stock

**Hết món**:
Món có tồn kho bằng 0; vẫn hiển thị nhưng không thêm vào giỏ được.

**Ngừng bán**:
Món bị ẩn khỏi thực đơn dù còn tồn kho. Khác với Hết món.
_Avoid_: ẩn, unavailable

**Xóa món**:
Chủ quán bỏ hẳn một món khỏi thực đơn. Đơn hàng cũ vẫn giữ nguyên bản chụp của món; dòng giỏ hàng chứa món đó bị bỏ.

## Giỏ hàng

**Giỏ hàng**:
Các dòng giỏ hàng khách định đặt, luôn thuộc một quán duy nhất.
_Avoid_: cart

**Dòng giỏ hàng**:
Một món với một lựa chọn cụ thể (size, các topping, độ cay) và số lượng. Hai lựa chọn khác nhau là hai dòng khác nhau.
_Avoid_: cart item, mục giỏ

**Tồn kho còn lại**:
Tồn kho của món trừ tổng số lượng mọi dòng giỏ hàng của món đó.

**Tạm tính**:
Tổng tiền các dòng giỏ hàng, chưa có phí ship.

**Phí ship**:
Phí giao hàng cố định, miễn phí khi tạm tính đạt ngưỡng.
_Avoid_: phí vận chuyển, shipping

**Đơn tối thiểu**:
Tạm tính nhỏ nhất để được đặt đơn.

## Đơn hàng

**Đơn hàng**:
Bản chụp giỏ hàng tại lúc đặt, với giá do hệ thống tính lại, thông tin giao hàng và thanh toán khi nhận hàng.
_Avoid_: order, hóa đơn

**Trạng thái đơn**:
Đang chuẩn bị → Đang giao → Đã giao, suy ra từ thời gian kể từ lúc đặt; hoặc Đã hủy.

**Hủy đơn**:
Khách hủy đơn khi còn Đang chuẩn bị; tồn kho được hoàn lại.

## AI

**Gợi ý món**:
Câu trả lời của AI kèm các món có thật trong thực đơn, thêm vào giỏ được ngay.
