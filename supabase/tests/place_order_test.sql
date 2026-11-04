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
