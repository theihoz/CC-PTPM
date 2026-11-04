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
