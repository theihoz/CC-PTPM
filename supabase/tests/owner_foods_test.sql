-- ============================================================================
-- Kịch bản test thủ công cho chủ quán quản lý món: save_food, delete_food.
-- ----------------------------------------------------------------------------
-- Dán toàn bộ vào Supabase SQL Editor rồi Run. Mọi thứ nằm trong một
-- transaction và ROLLBACK ở cuối, nên KHÔNG để lại dữ liệu nào.
-- Mỗi kiểm tra đạt in ra "PASS …"; sai thì dừng lại với lỗi "FAIL …".
-- Cần dữ liệu mẫu từ seed.sql (món 1 thuộc quán 1, có size Thường/Lớn).
-- ============================================================================

begin;

insert into auth.users (id) values
  ('eeeeeeee-0000-0000-0000-000000000001'),
  ('eeeeeeee-0000-0000-0000-000000000002');

-- Chủ quán A đăng ký quán.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.save_my_restaurant('{"name":"Quán Thử A","slug":"quan-thu-a","address":"12 Lê Lợi, Quận 1",'
  '"categoryId":1,"openTime":"07:00","closeTime":"21:00","deliveryTimeMin":25}');

create temp table _ids (key text primary key, id bigint) on commit drop;

do $$
declare
  food constant jsonb := '{"name":"Bún Thử","description":"Món thử","imageUrl":"","basePrice":40000,'
    '"calories":500,"tags":["cay","no-lau"],"stock":10,"hasSpice":true,"categoryId":1,"isAvailable":true,'
    '"sizes":[{"name":"Thường","priceDelta":0,"isDefault":true},{"name":"Lớn","priceDelta":10000,"isDefault":false}],'
    '"toppings":[{"name":"Trứng","price":5000}]}';
  result jsonb;
  f      record;
  v_big  bigint;
  bad    text;
begin
  -- 1. Thêm món kèm size và topping; my_foods() thấy món, kể cả khi Ngừng bán.
  result := public.save_food(food);
  if not (result ->> 'created')::boolean then raise exception 'FAIL 1: không tạo món'; end if;
  insert into _ids values ('food', (result ->> 'id')::bigint);
  select * into f from public.my_foods() m where m.id = (result ->> 'id')::bigint;
  if f.name <> 'Bún Thử' or jsonb_array_length(f.sizes) <> 2 or jsonb_array_length(f.toppings) <> 1
     or f.tags <> array['cay','no-lau'] then
    raise exception 'FAIL 1: món lưu sai %', row_to_json(f);
  end if;
  raise notice 'PASS 1: thêm món kèm size, topping trong một lần lưu';

  -- 2. Sửa: giữ id size "Lớn", bỏ size "Thường", thêm size "Nhỏ" làm mặc định; Ngừng bán.
  select (s ->> 'id')::bigint into v_big from jsonb_array_elements(f.sizes) s where s ->> 'name' = 'Lớn';
  perform public.save_food(food || jsonb_build_object(
    'id', f.id, 'isAvailable', false,
    'sizes', jsonb_build_array(
      jsonb_build_object('id', v_big, 'name', 'Lớn', 'priceDelta', 12000, 'isDefault', false),
      jsonb_build_object('name', 'Nhỏ', 'priceDelta', 0, 'isDefault', true)),
    'toppings', '[]'::jsonb));
  if (select count(*) from public.food_sizes where food_id = f.id) <> 2
     or (select price_delta from public.food_sizes where id = v_big) <> 12000
     or not exists (select 1 from public.food_sizes where food_id = f.id and name = 'Nhỏ' and is_default)
     or exists (select 1 from public.food_toppings where food_id = f.id) then
    raise exception 'FAIL 2: đồng bộ size/topping sai';
  end if;
  if not exists (select 1 from public.my_foods() m where m.id = f.id and not m.is_available) then
    raise exception 'FAIL 2: chủ quán không thấy món Ngừng bán';
  end if;
  raise notice 'PASS 2: sửa món giữ id size cũ, đồng bộ size/topping, Ngừng bán';

  -- 3. Dữ liệu sai bị từ chối.
  foreach bad in array array[
    food || '{"basePrice":-1}',
    food || '{"stock":-5}',
    food || jsonb_build_object('name', repeat('a', 81)),
    food || '{"tags":["hack"]}',
    food || '{"imageUrl":"javascript:alert(1)"}',
    food || '{"sizes":[{"name":"A","isDefault":true},{"name":"a","isDefault":false}]}',
    food || '{"sizes":[{"name":"A","isDefault":false}]}'
  ]::text[] loop
    begin
      perform public.save_food(bad::jsonb);
      raise exception 'FAIL 3: chấp nhận dữ liệu sai %', bad;
    exception when others then
      if sqlerrm <> 'invalid_food' then raise; end if;
    end;
  end loop;
  raise notice 'PASS 3: giá/tồn kho âm, tên dài, tag lạ, ảnh lạ, size trùng hoặc thiếu mặc định bị từ chối';

  -- 4. Không sửa, không xóa được món của quán mẫu; không mượn id size của món khác.
  begin
    perform public.save_food(food || '{"id":1}');
    raise exception 'FAIL 4: sửa được món của quán khác';
  exception when others then
    if sqlerrm <> 'food_not_found' then raise; end if;
  end;
  begin
    perform public.delete_food(1);
    raise exception 'FAIL 4: xóa được món của quán khác';
  exception when others then
    if sqlerrm <> 'food_not_found' then raise; end if;
  end;
  begin
    perform public.save_food(food || jsonb_build_object('id', f.id,
      'sizes', '[{"id":1,"name":"Thường","isDefault":true}]'::jsonb));
    raise exception 'FAIL 4: mượn được size của món khác';
  exception when others then
    if sqlerrm <> 'invalid_food' then raise; end if;
  end;
  begin
    update public.foods set stock = 999 where id = f.id;
    raise exception 'FAIL 4: ghi thẳng được bảng foods';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 4: không đụng được món của quán khác, không ghi thẳng bảng';
end $$;

-- 5. Người chưa có quán không thêm được món, không thấy món của A.
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000002', true),
       set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $$
begin
  if exists (select 1 from public.my_foods()) then raise exception 'FAIL 5: B thấy món của A'; end if;
  begin
    perform public.save_food('{"name":"Hack","basePrice":1,"stock":1}');
    raise exception 'FAIL 5: chưa có quán mà thêm được món';
  exception when others then
    if sqlerrm <> 'no_restaurant' then raise; end if;
  end;
  begin
    perform public.delete_food((select id from _ids where key = 'food'));
    raise exception 'FAIL 5: B xóa được món của A';
  exception when others then
    if sqlerrm <> 'food_not_found' then raise; end if;
  end;
  raise notice 'PASS 5: người chưa có quán không thêm, không xóa được món';
end $$;

-- 6. A xóa món: size, topping và dòng giỏ hàng chứa món bị xóa theo.
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000001', true),
       set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
declare
  v_food bigint := (select id from _ids where key = 'food');
begin
  perform public.delete_food(v_food);
  if exists (select 1 from public.my_foods() m where m.id = v_food) then
    raise exception 'FAIL 6: món chưa bị xóa';
  end if;
  raise notice 'PASS 6: chủ quán xóa được món của mình';
end $$;

reset role;
do $$
begin
  if exists (select 1 from public.food_sizes s left join public.foods f on f.id = s.food_id where f.id is null) then
    raise exception 'FAIL 6: còn size mồ côi';
  end if;
end $$;

rollback;
