-- ============================================================================
-- TẤT CẢ kịch bản test SQL, chạy theo thứ tự. FILE SINH TỰ ĐỘNG, đừng sửa tay.
-- Nguồn: supabase/tests/*.sql · Sinh lại: npm run db:test-bundle
-- ----------------------------------------------------------------------------
-- Dán vào Supabase SQL Editor rồi Run. Kết quả mong đợi: 27 dòng "PASS …"
-- trong tab Messages, không có "FAIL". Mỗi phần tự ROLLBACK, không để lại dữ liệu.
--   Phần 1: RLS thực đơn, hồ sơ, giỏ hàng (rls_test.sql): 6 PASS
--   Phần 2: Đặt hàng (place_order) (place_order_test.sql): 9 PASS
--   Phần 3: Hủy đơn (cancel_order) (cancel_order_test.sql): 6 PASS
--   Phần 4: Chủ quán: đăng ký, sửa quán, Tạm đóng (restaurant_owner_test.sql): 6 PASS
-- ============================================================================

-- ##########################################################################
-- Phần 1: RLS thực đơn, hồ sơ, giỏ hàng · rls_test.sql
-- ##########################################################################

-- ============================================================================
-- Kịch bản test thủ công cho RLS của thực đơn, hồ sơ và giỏ hàng.
-- ----------------------------------------------------------------------------
-- Dán toàn bộ vào Supabase SQL Editor rồi Run. Mọi thứ nằm trong một
-- transaction và ROLLBACK ở cuối, nên KHÔNG để lại dữ liệu nào.
-- Mỗi kiểm tra đạt in ra "PASS …"; sai thì dừng lại với lỗi "FAIL …".
-- Cần dữ liệu mẫu từ seed.sql.
-- ============================================================================

begin;

-- Hai tài khoản thử; trigger on_auth_user_created tự tạo hồ sơ từ metadata.
insert into auth.users (id, raw_user_meta_data) values
  ('cccccccc-0000-0000-0000-000000000001', '{"full_name":" Người Thử A ","phone":"090 123 4567"}'),
  ('cccccccc-0000-0000-0000-000000000002', '{"full_name":"Người Thử B","phone":"12345"}');

do $$
begin
  -- 1. Trigger tạo hồ sơ: cắt khoảng trắng tên, chuẩn hóa số điện thoại, bỏ số sai định dạng.
  if (select full_name || '|' || phone from public.profiles
      where id = 'cccccccc-0000-0000-0000-000000000001') <> 'Người Thử A|0901234567' then
    raise exception 'FAIL 1: hồ sơ A tạo sai';
  end if;
  if (select phone from public.profiles where id = 'cccccccc-0000-0000-0000-000000000002') <> '' then
    raise exception 'FAIL 1: số điện thoại sai định dạng không bị bỏ';
  end if;
  raise notice 'PASS 1: trigger tạo hồ sơ khi đăng ký';
end $$;

-- Đóng vai người dùng A.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
begin
  -- 2. Thực đơn: đọc được, không ghi được.
  if (select count(*) from public.foods) = 0 then raise exception 'FAIL 2: không đọc được thực đơn'; end if;
  begin
    update public.foods set stock = 999 where id = 1;
    raise exception 'FAIL 2: sửa được tồn kho';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.categories (slug, name) values ('hack', 'Hack');
    raise exception 'FAIL 2: thêm được danh mục';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 2: thực đơn chỉ đọc';

  -- 3. Hồ sơ: chỉ thấy và sửa hồ sơ của mình, chỉ sửa được 3 cột thông tin.
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL 3: thấy hồ sơ người khác'; end if;
  update public.profiles set default_address = '12 Lê Lợi' where id = auth.uid();
  update public.profiles set full_name = 'Hack' where id = 'cccccccc-0000-0000-0000-000000000002';
  begin
    update public.profiles set id = gen_random_uuid() where id = auth.uid();
    raise exception 'FAIL 3: đổi được id hồ sơ';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set phone = 'abc' where id = auth.uid();
    raise exception 'FAIL 3: lưu được số điện thoại sai';
  exception when check_violation then null;
  end;
  raise notice 'PASS 3: hồ sơ chỉ chủ tài khoản đọc/sửa';

  -- 4. Giỏ hàng: replace_cart gộp dòng trùng (topping khác thứ tự), chặn dữ liệu sai.
  perform public.replace_cart(
    '[{"foodId":1,"sizeId":1,"toppingIds":[3,1],"quantity":2},
      {"foodId":1,"sizeId":1,"toppingIds":[1,3],"quantity":3}]');
  if (select quantity from public.cart_items where food_id = 1) <> 5 then
    raise exception 'FAIL 4: replace_cart không gộp dòng trùng';
  end if;
  begin
    insert into public.cart_items (food_id, topping_ids, quantity) values (1, '{3,1}', 1);
    raise exception 'FAIL 4: lưu được topping chưa sắp xếp';
  exception when check_violation then null;
  end;
  begin
    insert into public.cart_items (user_id, food_id, quantity)
    values ('cccccccc-0000-0000-0000-000000000002', 2, 1);
    raise exception 'FAIL 4: thêm được dòng vào giỏ người khác';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 4: giỏ hàng gộp dòng trùng và chặn dữ liệu sai';
end $$;

-- Đóng vai người dùng B.
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000002', true),
       set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $$
begin
  -- 5. B không thấy giỏ và hồ sơ của A; A không sửa được tên của B ở bước 3.
  if exists (select 1 from public.cart_items) then raise exception 'FAIL 5: B thấy giỏ của A'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL 5: B thấy hồ sơ của A'; end if;
  if (select full_name from public.profiles) <> 'Người Thử B' then
    raise exception 'FAIL 5: A đã sửa được tên của B';
  end if;
  raise notice 'PASS 5: không truy cập chéo hồ sơ và giỏ hàng';
end $$;

-- 6. Khách chưa đăng nhập: đọc thực đơn được, hồ sơ và giỏ hàng thì không.
reset role;
set local role anon;
do $$
begin
  if (select count(*) from public.restaurants) = 0 then raise exception 'FAIL 6: anon không đọc được thực đơn'; end if;
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL 6: anon đọc được hồ sơ';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.replace_cart('[]');
    raise exception 'FAIL 6: anon gọi được replace_cart';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 6: anon chỉ đọc được thực đơn';
end $$;

rollback;

-- ##########################################################################
-- Phần 2: Đặt hàng (place_order) · place_order_test.sql
-- ##########################################################################

-- ============================================================================
-- Kịch bản test thủ công cho place_order và RLS của đơn hàng.
-- ----------------------------------------------------------------------------
-- Dán toàn bộ vào Supabase SQL Editor rồi Run. Mọi thứ nằm trong một
-- transaction và ROLLBACK ở cuối, nên KHÔNG để lại dữ liệu nào.
-- Mỗi kiểm tra đạt in ra "PASS …"; sai thì dừng lại với lỗi "FAIL …".
-- Cần dữ liệu mẫu từ seed.sql (món 1 = Phở bò tái, 2 = Bún bò Huế còn 3 phần,
-- 5 = Gỏi cuốn 35.000đ, 6 = Cơm tấm của quán khác).
-- ============================================================================

begin;

-- Hai tài khoản thử, chỉ tồn tại trong transaction này.
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002');

-- Đóng vai người dùng A.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
declare
  delivery constant jsonb := '{"recipientName":"Người Thử","phone":"0901234567","address":"12 Lê Lợi, Quận 1","note":""}';
  stock_before integer;
  stock_after  integer;
  result       jsonb;
  o            record;
  err          text;
  err_detail   text;
begin
  -- 1. Đặt quá tồn kho: bị từ chối, báo đúng món, không trừ kho.
  select stock into stock_before from public.foods where id = 2;
  begin
    perform public.place_order('[{"foodId":2,"quantity":4}]', delivery);
    raise exception 'FAIL 1: đặt quá kho mà không bị từ chối';
  exception when others then
    get stacked diagnostics err = message_text, err_detail = pg_exception_detail;
    if err <> 'out_of_stock' then raise; end if;
    if (err_detail::jsonb -> 0 ->> 'foodId')::int <> 2 then
      raise exception 'FAIL 1: detail không chỉ ra món 2: %', err_detail;
    end if;
  end;
  select stock into stock_after from public.foods where id = 2;
  if stock_after <> stock_before then raise exception 'FAIL 1: kho bị trừ dù đơn bị từ chối'; end if;
  raise notice 'PASS 1: đặt quá kho bị từ chối, không trừ kho (detail %)', err_detail;

  -- 2. Giá giả do client gửi bị bỏ qua; server tự tính. Phở bò tái size Lớn = 55.000 + 15.000.
  insert into public.cart_items (food_id, size_id, quantity) values (1, 2, 1);
  select stock into stock_before from public.foods where id = 1;
  result := public.place_order(
    '[{"foodId":1,"sizeId":2,"quantity":1,"unitPrice":1,"price":1,"total":1}]',
    delivery || '{"subtotal":1,"total":1}');
  select * into o from public.orders where id = (result ->> 'id')::uuid;
  if o.subtotal <> 70000 or o.shipping_fee <> 15000 or o.total <> 85000 then
    raise exception 'FAIL 2: tổng sai: % + % = %', o.subtotal, o.shipping_fee, o.total;
  end if;
  if o.code !~ '^FD-[0-9]{6}-[0-9]{4}$' then raise exception 'FAIL 2: mã đơn sai dạng: %', o.code; end if;
  select stock into stock_after from public.foods where id = 1;
  if stock_after <> stock_before - 1 then raise exception 'FAIL 2: không trừ kho đúng'; end if;
  if exists (select 1 from public.cart_items) then raise exception 'FAIL 2: giỏ chưa được xóa'; end if;
  if (select default_address from public.profiles where id = auth.uid()) <> '12 Lê Lợi, Quận 1' then
    raise exception 'FAIL 2: chưa lưu địa chỉ mặc định';
  end if;
  if (select count(*) from public.order_items where order_id = o.id and unit_price = 70000 and size_name = 'Lớn') <> 1 then
    raise exception 'FAIL 2: bản chụp món sai';
  end if;
  raise notice 'PASS 2: bỏ qua giá giả, tổng % (mã %), trừ kho, xóa giỏ, lưu địa chỉ', o.total, o.code;

  -- 3. Size hoặc topping không thuộc món: bị từ chối.
  begin
    perform public.place_order('[{"foodId":1,"sizeId":3,"quantity":1}]', delivery); -- size 3 thuộc món 2
    raise exception 'FAIL 3: size sai món mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'invalid_item' then raise; end if;
  end;
  begin
    perform public.place_order('[{"foodId":1,"toppingIds":[4],"quantity":1}]', delivery); -- topping 4 thuộc món 2
    raise exception 'FAIL 3: topping sai món mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'invalid_item' then raise; end if;
  end;
  raise notice 'PASS 3: size và topping không thuộc món bị từ chối';

  -- 4. Dưới đơn tối thiểu 50.000đ: bị từ chối.
  begin
    perform public.place_order('[{"foodId":5,"quantity":1}]', delivery); -- 35.000đ
    raise exception 'FAIL 4: đơn dưới tối thiểu mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'below_minimum' then raise; end if;
  end;
  raise notice 'PASS 4: đơn dưới tối thiểu bị từ chối';

  -- 5. Món của hai quán trong một đơn: bị từ chối.
  begin
    perform public.place_order('[{"foodId":1,"quantity":1},{"foodId":6,"quantity":1}]', delivery);
    raise exception 'FAIL 5: đơn hai quán mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'mixed_restaurants' then raise; end if;
  end;
  raise notice 'PASS 5: đơn trộn hai quán bị từ chối';

  -- 6. Không INSERT/UPDATE trực tiếp vào orders.
  begin
    insert into public.orders (code, user_id, restaurant_id, recipient_name, phone, address, subtotal, shipping_fee, total)
    values ('FD-000000-9999', auth.uid(), 1, 'Hack', '0901234567', '12 Lê Lợi', 1, 0, 1);
    raise exception 'FAIL 6: INSERT trực tiếp vào orders được phép';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set total = 1;
    raise exception 'FAIL 6: UPDATE trực tiếp vào orders được phép';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 6: không INSERT/UPDATE trực tiếp được vào orders';

  -- 7. Thông tin giao hàng sai: bị từ chối.
  begin
    perform public.place_order('[{"foodId":1,"quantity":1}]', '{"recipientName":"A","phone":"123","address":"x"}');
    raise exception 'FAIL 7: thông tin giao hàng sai mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'invalid_delivery' then raise; end if;
  end;
  raise notice 'PASS 7: thông tin giao hàng sai bị từ chối';
end $$;

-- 8. Người dùng B không thấy đơn của A.
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000002', true),
       set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.orders) or exists (select 1 from public.order_items) then
    raise exception 'FAIL 8: B đọc được đơn của A';
  end if;
  raise notice 'PASS 8: B không đọc được đơn của A';
end $$;

-- 9. Khách chưa đăng nhập không gọi được place_order.
reset role;
set local role anon;
do $$
begin
  begin
    perform public.place_order('[{"foodId":1,"quantity":1}]', '{}');
    raise exception 'FAIL 9: anon gọi được place_order';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 9: anon không gọi được place_order';
end $$;

rollback;

-- ##########################################################################
-- Phần 3: Hủy đơn (cancel_order) · cancel_order_test.sql
-- ##########################################################################

-- ============================================================================
-- Kịch bản test thủ công cho cancel_order.
-- ----------------------------------------------------------------------------
-- Dán toàn bộ vào Supabase SQL Editor rồi Run. Mọi thứ nằm trong một
-- transaction và ROLLBACK ở cuối, nên KHÔNG để lại dữ liệu nào.
-- Mỗi kiểm tra đạt in ra "PASS …"; sai thì dừng lại với lỗi "FAIL …".
-- Cần dữ liệu mẫu từ seed.sql (món 3 = Phở gà 50.000đ, còn nhiều phần).
-- ============================================================================

begin;

insert into auth.users (id) values
  ('bbbbbbbb-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

-- Người dùng A đặt hai đơn: một đơn để hủy ngay, một đơn để thử hủy quá giờ.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);

create temp table _test_orders (label text primary key, id uuid);
grant all on _test_orders to authenticated;

do $$
declare
  delivery constant jsonb := '{"recipientName":"Người Thử","phone":"0901234567","address":"12 Lê Lợi, Quận 1"}';
begin
  insert into _test_orders values
    ('fresh', (public.place_order('[{"foodId":3,"quantity":2}]', delivery) ->> 'id')::uuid),
    ('old',   (public.place_order('[{"foodId":3,"quantity":1}]', delivery) ->> 'id')::uuid);
end $$;

-- Giả lập đơn "old" đã đặt từ 1 phút trước (chỉ chủ database làm được việc này).
reset role;
update public.orders set created_at = created_at - interval '1 minute'
where id = (select id from _test_orders where label = 'old');
set local role authenticated;

do $$
declare
  fresh uuid := (select id from _test_orders where label = 'fresh');
  old   uuid := (select id from _test_orders where label = 'old');
  stock_before integer;
  stock_after  integer;
  result jsonb;
begin
  -- 1. Hủy đơn còn đang chuẩn bị: đặt cancelled_at và hoàn đúng 2 phần vào kho.
  select stock into stock_before from public.foods where id = 3;
  result := public.cancel_order(fresh);
  select stock into stock_after from public.foods where id = 3;
  if stock_after <> stock_before + 2 then
    raise exception 'FAIL 1: hoàn kho sai: % → %', stock_before, stock_after;
  end if;
  if (select cancelled_at from public.orders where id = fresh) is null then
    raise exception 'FAIL 1: chưa đặt cancelled_at';
  end if;
  raise notice 'PASS 1: hủy đơn đang chuẩn bị, hoàn kho % → %', stock_before, stock_after;

  -- 2. Hủy lần hai: bị từ chối, không hoàn kho thêm.
  begin
    perform public.cancel_order(fresh);
    raise exception 'FAIL 2: hủy lần hai mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'already_cancelled' then raise; end if;
  end;
  if (select stock from public.foods where id = 3) <> stock_after then
    raise exception 'FAIL 2: kho bị cộng thêm khi hủy lần hai';
  end if;
  raise notice 'PASS 2: không hủy được lần hai';

  -- 3. Quá 30 giây (đã sang đang giao): bị từ chối, kho không đổi.
  begin
    perform public.cancel_order(old);
    raise exception 'FAIL 3: hủy quá giờ mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'too_late' then raise; end if;
  end;
  if (select cancelled_at from public.orders where id = old) is not null then
    raise exception 'FAIL 3: đơn quá giờ vẫn bị đánh dấu hủy';
  end if;
  raise notice 'PASS 3: không hủy được khi đã quá thời gian chuẩn bị';

  -- 4. Đơn không tồn tại.
  begin
    perform public.cancel_order(gen_random_uuid());
    raise exception 'FAIL 4: hủy đơn không tồn tại mà không bị từ chối';
  exception when others then
    if sqlerrm <> 'order_not_found' then raise; end if;
  end;
  raise notice 'PASS 4: đơn không tồn tại bị từ chối';
end $$;

-- 5. Người dùng B không hủy được đơn của A (kể cả biết id).
reset role;
update public.orders set created_at = now()
where id = (select id from _test_orders where label = 'old');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true),
       set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare
  old uuid := (select id from _test_orders where label = 'old');
begin
  begin
    perform public.cancel_order(old);
    raise exception 'FAIL 5: B hủy được đơn của A';
  exception when others then
    if sqlerrm <> 'order_not_found' then raise; end if;
  end;
  raise notice 'PASS 5: không hủy được đơn của người khác';
end $$;

-- 6. Khách chưa đăng nhập không gọi được cancel_order.
reset role;
set local role anon;
do $$
begin
  begin
    perform public.cancel_order(gen_random_uuid());
    raise exception 'FAIL 6: anon gọi được cancel_order';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 6: anon không gọi được cancel_order';
end $$;

rollback;

-- ##########################################################################
-- Phần 4: Chủ quán: đăng ký, sửa quán, Tạm đóng · restaurant_owner_test.sql
-- ##########################################################################

-- ============================================================================
-- Kịch bản test thủ công cho chủ quán: đăng ký quán, sửa quán, Tạm đóng.
-- ----------------------------------------------------------------------------
-- Dán toàn bộ vào Supabase SQL Editor rồi Run. Mọi thứ nằm trong một
-- transaction và ROLLBACK ở cuối, nên KHÔNG để lại dữ liệu nào.
-- Mỗi kiểm tra đạt in ra "PASS …"; sai thì dừng lại với lỗi "FAIL …".
-- Cần dữ liệu mẫu từ seed.sql (quán 1 có slug pho-ha-thanh, món 1 thuộc quán 1).
-- ============================================================================

begin;

-- Hai tài khoản thử, chỉ tồn tại trong transaction này.
insert into auth.users (id) values
  ('dddddddd-0000-0000-0000-000000000001'),
  ('dddddddd-0000-0000-0000-000000000002');

-- Đóng vai người dùng A.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
declare
  shop constant jsonb := '{"name":"Bún Chả Thử","slug":"pho-ha-thanh","description":"Quán thử",'
    '"imageUrl":"","address":"12 Lê Lợi, Quận 1","categoryId":1,"openTime":"07:00",'
    '"closeTime":"21:00","deliveryTimeMin":25,"isOpen":true}';
  result jsonb;
  again  jsonb;
  err    text;
begin
  -- 1. Chưa có quán thì my_restaurant() rỗng; đăng ký tạo quán, slug trùng thì thêm số.
  if exists (select 1 from public.my_restaurant()) then raise exception 'FAIL 1: đã có quán'; end if;
  result := public.save_my_restaurant(shop);
  if not (result ->> 'created')::boolean then raise exception 'FAIL 1: không tạo quán'; end if;
  if result ->> 'slug' = 'pho-ha-thanh' then raise exception 'FAIL 1: slug bị trùng'; end if;
  if (select name from public.my_restaurant()) <> 'Bún Chả Thử' then
    raise exception 'FAIL 1: my_restaurant() không thấy quán vừa tạo';
  end if;
  raise notice 'PASS 1: đăng ký quán, slug trùng tự thêm số (%)', result ->> 'slug';

  -- 2. Gọi lại là sửa quán cũ, không tạo quán thứ hai; slug giữ nguyên.
  again := public.save_my_restaurant(shop || '{"name":"Bún Chả Đổi Tên","slug":"khac"}');
  if (again ->> 'created')::boolean or again ->> 'id' <> result ->> 'id'
     or again ->> 'slug' <> result ->> 'slug' then
    raise exception 'FAIL 2: tạo quán thứ hai hoặc đổi slug';
  end if;
  if (select count(*) from public.my_restaurant()) <> 1 then raise exception 'FAIL 2: có hai quán'; end if;
  raise notice 'PASS 2: mỗi tài khoản một quán, lưu lại là sửa';

  -- 3. Dữ liệu sai bị từ chối: tên quá dài, danh mục không tồn tại, ảnh không phải https.
  foreach err in array array[
    shop || jsonb_build_object('name', repeat('a', 81)),
    shop || '{"categoryId":999}',
    shop || '{"imageUrl":"javascript:alert(1)"}',
    shop || '{"openTime":"25:99"}'
  ]::text[] loop
    begin
      perform public.save_my_restaurant(err::jsonb);
      raise exception 'FAIL 3: chấp nhận dữ liệu sai %', err;
    exception when others then
      if sqlerrm <> 'invalid_restaurant' then raise; end if;
    end;
  end loop;
  raise notice 'PASS 3: dữ liệu quán sai bị từ chối';

  -- 4. Không ghi thẳng vào bảng được; không đọc được owner_id.
  begin
    update public.restaurants set rating = 5 where id = (result ->> 'id')::bigint;
    raise exception 'FAIL 4: tự sửa được rating';
  exception when insufficient_privilege then null;
  end;
  begin
    perform owner_id from public.restaurants limit 1;
    raise exception 'FAIL 4: đọc được owner_id';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 4: không ghi thẳng bảng quán, owner_id bị ẩn';
end $$;

-- Đóng vai người dùng B: không thấy, không sửa được quán của A.
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000002', true),
       set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $$
declare
  result jsonb;
begin
  -- 5. B chưa có quán; lưu thì tạo quán riêng của B, quán A không đổi.
  if exists (select 1 from public.my_restaurant()) then raise exception 'FAIL 5: B thấy quán của A'; end if;
  result := public.save_my_restaurant('{"name":"Quán Của B","slug":"quan-cua-b","address":"34 Hai Bà Trưng",'
    '"categoryId":2,"openTime":"08:00","closeTime":"20:00","deliveryTimeMin":30}');
  if not (result ->> 'created')::boolean then raise exception 'FAIL 5: B sửa nhầm quán của A'; end if;
  if (select count(*) from public.restaurants where name = 'Bún Chả Đổi Tên') <> 1 then
    raise exception 'FAIL 5: quán của A bị đổi';
  end if;
  raise notice 'PASS 5: chủ quán B không đụng được quán của A';
end $$;

-- 6. Quán Tạm đóng không nhận đơn; đặt lỗi thì không trừ kho.
reset role;
update public.restaurants set is_open = false where id = 1;
set local role authenticated;

do $$
declare
  stock_before integer;
begin
  select stock into stock_before from public.foods where id = 1;
  begin
    perform public.place_order('[{"foodId":1,"quantity":2}]',
      '{"recipientName":"Người Thử","phone":"0901234567","address":"12 Lê Lợi, Quận 1","note":""}');
    raise exception 'FAIL 6: đặt được đơn ở quán Tạm đóng';
  exception when others then
    if sqlerrm <> 'restaurant_closed' then raise; end if;
  end;
  if (select stock from public.foods where id = 1) <> stock_before then
    raise exception 'FAIL 6: bị trừ kho khi quán Tạm đóng';
  end if;
  raise notice 'PASS 6: quán Tạm đóng không nhận đơn, không trừ kho';
end $$;

rollback;
