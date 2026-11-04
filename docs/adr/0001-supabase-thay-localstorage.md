# Dùng Supabase làm backend thay cho Mock Data và LocalStorage

Đề bài cho phép mô phỏng đơn hàng bằng Pinia và LocalStorage, nhưng nhóm chọn Supabase (Auth, Postgres, RLS, RPC) vì chỉ phía server mới tính lại giá, kiểm tra và trừ tồn kho trong một transaction được, và giỏ hàng, đơn hàng mới đồng bộ được giữa các thiết bị. Đổi lại, bản build production bắt buộc phải có Supabase. LocalStorage chỉ còn dùng cho giỏ hàng của khách vãng lai.
