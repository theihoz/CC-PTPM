-- ============================================================================
-- 0005 · Hủy đơn và hoàn tồn kho: RPC cancel_order
-- ----------------------------------------------------------------------------
-- Chạy trong Supabase SQL Editor sau migration orders. Chạy lại an toàn.
-- Mốc "đang chuẩn bị" phải khớp PREPARING_MS trong src/lib/orderStatus.js (30 giây).
-- ============================================================================

-- cancel_order(order_id) → { id, cancelledAt }
-- Lỗi (message):
--   not_authenticated · order_not_found (kể cả đơn của người khác) ·
--   already_cancelled · too_late (đã quá thời gian chuẩn bị)
--
-- SECURITY DEFINER vì cần ghi orders.cancelled_at và cộng lại foods.stock,
-- hai bảng mà client không có quyền ghi. Người dùng luôn lấy từ auth.uid().
create or replace function public.cancel_order(order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_preparing  constant interval := interval '30 seconds';
  v_user       uuid := auth.uid();
  v_order      public.orders%rowtype;
  v_now        timestamptz := now();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Khóa đơn để hai lần bấm hủy song song không cùng hoàn kho hai lần.
  select * into v_order
  from public.orders o
  where o.id = cancel_order.order_id and o.user_id = v_user
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.cancelled_at is not null then
    raise exception 'already_cancelled' using errcode = '22023';
  end if;

  -- Thời gian tính theo đồng hồ máy chủ, không tin đồng hồ của client.
  if v_now - v_order.created_at >= c_preparing then
    raise exception 'too_late' using errcode = '22023';
  end if;

  update public.orders set cancelled_at = v_now where id = v_order.id;

  -- Hoàn kho theo bản chụp; món đã bị xóa khỏi thực đơn (food_id null) thì bỏ qua.
  update public.foods f
  set stock = f.stock + q.quantity
  from (
    select oi.food_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = v_order.id and oi.food_id is not null
    group by oi.food_id
  ) q
  where f.id = q.food_id;

  return jsonb_build_object('id', v_order.id, 'cancelledAt', v_now);
end;
$$;

revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;
