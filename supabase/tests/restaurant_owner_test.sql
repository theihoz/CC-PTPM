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
