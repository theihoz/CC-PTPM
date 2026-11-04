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
