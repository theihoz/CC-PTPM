-- ============================================================================
-- 0006 · Chủ quán: đăng ký quán, sửa thông tin quán, Tạm đóng
-- ----------------------------------------------------------------------------
-- Chạy sau các migration trước. Chạy lại an toàn.
-- Mỗi tài khoản có tối đa một quán. Quán mẫu không có chủ (owner_id null).
-- Client không ghi thẳng vào bảng restaurants; mọi thay đổi đi qua RPC
-- save_my_restaurant, giống cách đặt đơn đi qua place_order.
-- ============================================================================

alter table public.restaurants
  add column if not exists owner_id uuid unique references auth.users (id) on delete set null,
  add column if not exists is_open boolean not null default true;

comment on column public.restaurants.owner_id is 'Chủ quán. null với quán mẫu. Mỗi tài khoản tối đa một quán.';
comment on column public.restaurants.is_open is 'false là Tạm đóng: ẩn khỏi danh sách và gợi ý AI, không nhận đơn mới.';

-- Giới hạn độ dài vì chủ quán tự nhập; tên và mô tả còn được đưa vào prompt AI.
alter table public.restaurants drop constraint if exists restaurants_text_length;
alter table public.restaurants add constraint restaurants_text_length check (
  length(name) <= 80
  and length(description) <= 300
  and length(address) <= 300
  and (image_url is null or (length(image_url) <= 500 and image_url ~ '^https://'))
);

-- ── Quyền đọc: ẩn owner_id khỏi Data API ────────────────────────────────────
-- Ai cũng đọc được quán, nhưng không cần biết tài khoản nào là chủ.
revoke select on public.restaurants from anon, authenticated;
grant select (
  id, slug, name, description, image_url, address, category_id, rating, rating_count,
  delivery_time_min, open_time, close_time, is_featured, is_open, created_at, updated_at
) on public.restaurants to anon, authenticated;

-- ── my_restaurant(): quán của người đang đăng nhập ──────────────────────────
-- Trả về đúng một dòng, hoặc không dòng nào khi chưa có quán.
create or replace function public.my_restaurant()
returns table (
  id bigint, slug text, name text, description text, image_url text, address text,
  category_id smallint, delivery_time_min smallint, open_time time, close_time time,
  is_open boolean, rating numeric, rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.slug, r.name, r.description, r.image_url, r.address,
         r.category_id, r.delivery_time_min, r.open_time, r.close_time,
         r.is_open, r.rating, r.rating_count
  from public.restaurants r
  where r.owner_id = auth.uid()
$$;

revoke execute on function public.my_restaurant() from public, anon;
grant execute on function public.my_restaurant() to authenticated;

-- ── save_my_restaurant(payload): đăng ký quán mới hoặc sửa quán của mình ────
-- payload: { name, slug, description, imageUrl, address, categoryId,
--            openTime, closeTime, deliveryTimeMin, isOpen }
-- slug chỉ dùng khi tạo quán (client sinh từ tên); trùng thì thêm -2, -3…
-- Trả về: { id, slug, created }
-- Lỗi (message): not_authenticated · invalid_restaurant
-- Chủ quán không sửa được rating, nổi bật, chủ quán hay slug.
create or replace function public.save_my_restaurant(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user      uuid := auth.uid();
  v_id        bigint;
  v_slug      text;
  v_base      text := lower(trim(coalesce(payload ->> 'slug', '')));
  v_name      text := trim(coalesce(payload ->> 'name', ''));
  v_desc      text := trim(coalesce(payload ->> 'description', ''));
  v_image     text := nullif(trim(coalesce(payload ->> 'imageUrl', '')), '');
  v_address   text := trim(coalesce(payload ->> 'address', ''));
  v_category  smallint;
  v_open      time;
  v_close     time;
  v_delivery  smallint;
  v_is_open   boolean := coalesce((payload ->> 'isOpen')::boolean, true);
  v_n         integer := 1;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  begin
    v_category := (payload ->> 'categoryId')::smallint;
    v_open     := (payload ->> 'openTime')::time;
    v_close    := (payload ->> 'closeTime')::time;
    v_delivery := (payload ->> 'deliveryTimeMin')::smallint;
  exception when others then
    raise exception 'invalid_restaurant' using errcode = '22023';
  end;

  if length(v_name) not between 2 and 80
     or length(v_desc) > 300
     or length(v_address) not between 5 and 300
     or (v_image is not null and (length(v_image) > 500 or v_image !~ '^https://'))
     or v_category is null
     or not exists (select 1 from public.categories c where c.id = v_category)
     or v_open is null or v_close is null
     or v_delivery is null or v_delivery not between 5 and 180 then
    raise exception 'invalid_restaurant' using errcode = '22023';
  end if;

  select r.id into v_id from public.restaurants r where r.owner_id = v_user for update;

  if v_id is not null then
    update public.restaurants
    set name = v_name, description = v_desc, image_url = v_image, address = v_address,
        category_id = v_category, open_time = v_open, close_time = v_close,
        delivery_time_min = v_delivery, is_open = v_is_open
    where id = v_id
    returning slug into v_slug;
    return jsonb_build_object('id', v_id, 'slug', v_slug, 'created', false);
  end if;

  if v_base !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_base) > 60 then
    v_base := 'quan';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.restaurants r where r.slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.restaurants
    (slug, name, description, image_url, address, category_id,
     open_time, close_time, delivery_time_min, is_open, owner_id)
  values
    (v_slug, v_name, v_desc, v_image, v_address, v_category,
     v_open, v_close, v_delivery, v_is_open, v_user)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'created', true);
end;
$$;

revoke execute on function public.save_my_restaurant(jsonb) from public, anon;
grant execute on function public.save_my_restaurant(jsonb) to authenticated;

-- ── Quán Tạm đóng không nhận đơn mới ────────────────────────────────────────
-- Kiểm tra ngay lúc ghi đơn, nên place_order báo lỗi restaurant_closed và
-- toàn bộ transaction (kể cả trừ kho) được hoàn tác.
create or replace function public.orders_require_open_restaurant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.restaurants r where r.id = new.restaurant_id and r.is_open
  ) then
    raise exception 'restaurant_closed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke execute on function public.orders_require_open_restaurant() from public, anon, authenticated;

drop trigger if exists orders_require_open_restaurant on public.orders;
create trigger orders_require_open_restaurant
  before insert on public.orders
  for each row execute function public.orders_require_open_restaurant();
