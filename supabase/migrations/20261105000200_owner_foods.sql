-- ============================================================================
-- 0007 · Chủ quán quản lý món: thêm, sửa, Ngừng bán, Xóa món
-- ----------------------------------------------------------------------------
-- Chạy sau 20261105000100_restaurant_owner.sql. Chạy lại an toàn.
-- Client vẫn không ghi thẳng vào foods, food_sizes, food_toppings; mọi thay đổi
-- đi qua RPC save_food và delete_food, và chỉ chạm được món của quán mình.
-- ============================================================================

-- Giới hạn độ dài vì chủ quán tự nhập; tên món còn được đưa vào prompt AI.
alter table public.foods drop constraint if exists foods_text_length;
alter table public.foods add constraint foods_text_length check (
  length(name) <= 80
  and length(description) <= 300
  and (image_url is null or (length(image_url) <= 500 and image_url ~ '^https://'))
);

alter table public.food_sizes drop constraint if exists food_sizes_name_length;
alter table public.food_sizes add constraint food_sizes_name_length check (length(name) <= 40);

alter table public.food_toppings drop constraint if exists food_toppings_name_length;
alter table public.food_toppings add constraint food_toppings_name_length check (length(name) <= 40);

-- ── my_foods(): toàn bộ món của quán mình, kể cả món Ngừng bán ──────────────
-- sizes/toppings là mảng JSON [{ id, name, priceDelta|price, isDefault }].
create or replace function public.my_foods()
returns table (
  id bigint, category_id smallint, name text, description text, image_url text,
  base_price integer, calories integer, tags text[], stock integer, has_spice boolean,
  is_available boolean, sizes jsonb, toppings jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, f.category_id, f.name, f.description, f.image_url,
         f.base_price, f.calories, f.tags, f.stock, f.has_spice, f.is_available,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', s.id, 'name', s.name, 'priceDelta', s.price_delta, 'isDefault', s.is_default)
                  order by s.sort_order, s.id)
           from public.food_sizes s where s.food_id = f.id
         ), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'price', t.price)
                  order by t.sort_order, t.id)
           from public.food_toppings t where t.food_id = f.id
         ), '[]'::jsonb)
  from public.foods f
  join public.restaurants r on r.id = f.restaurant_id
  where r.owner_id = auth.uid()
  order by f.sort_order, f.id
$$;

revoke execute on function public.my_foods() from public, anon;
grant execute on function public.my_foods() to authenticated;

-- ── save_food(payload): thêm món mới (không có id) hoặc sửa món của quán mình ─
-- payload: { id?, name, description, imageUrl, basePrice, calories, tags, stock,
--            hasSpice, categoryId, isAvailable,
--            sizes: [{ id?, name, priceDelta, isDefault }],
--            toppings: [{ id?, name, price }] }
-- Size/topping có id thì sửa tại chỗ (giữ nguyên dòng giỏ hàng của khách),
-- không có id thì thêm mới, id cũ không còn trong payload thì bị xóa.
-- Trả về: { id, created }
-- Lỗi (message): not_authenticated · no_restaurant · food_not_found · invalid_food
create or replace function public.save_food(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_tags constant text[] := array['cay','chay','it-calo','giau-dam','no-lau','nhe-bung','ngot','mat-lanh'];
  c_max_price constant integer := 10000000;

  v_user        uuid := auth.uid();
  v_restaurant  bigint;
  v_id          bigint;
  v_created     boolean := false;
  v_name        text := trim(coalesce(payload ->> 'name', ''));
  v_desc        text := trim(coalesce(payload ->> 'description', ''));
  v_image       text := nullif(trim(coalesce(payload ->> 'imageUrl', '')), '');
  v_price       integer;
  v_calories    integer;
  v_stock       integer;
  v_category    smallint;
  v_has_spice   boolean;
  v_available   boolean;
  v_tags        text[];
  v_sizes       jsonb := coalesce(payload -> 'sizes', '[]'::jsonb);
  v_toppings    jsonb := coalesce(payload -> 'toppings', '[]'::jsonb);
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select r.id into v_restaurant from public.restaurants r where r.owner_id = v_user;
  if v_restaurant is null then
    raise exception 'no_restaurant' using errcode = 'P0001';
  end if;

  -- 1. Đọc và kiểm tra các trường của món.
  begin
    v_id        := nullif(payload ->> 'id', '')::bigint;
    v_price     := (payload ->> 'basePrice')::integer;
    v_calories  := coalesce((payload ->> 'calories')::integer, 0);
    v_stock     := (payload ->> 'stock')::integer;
    v_category  := nullif(payload ->> 'categoryId', '')::smallint;
    v_has_spice := coalesce((payload ->> 'hasSpice')::boolean, false);
    v_available := coalesce((payload ->> 'isAvailable')::boolean, true);
    v_tags      := coalesce(
      (select array_agg(distinct t order by t) from jsonb_array_elements_text(coalesce(payload -> 'tags', '[]')) as t),
      '{}');
  exception when others then
    raise exception 'invalid_food' using errcode = '22023';
  end;

  if length(v_name) not between 2 and 80
     or length(v_desc) > 300
     or (v_image is not null and (length(v_image) > 500 or v_image !~ '^https://'))
     or v_price is null or v_price not between 0 and c_max_price
     or v_calories not between 0 and 10000
     or v_stock is null or v_stock not between 0 and 9999
     or (v_category is not null and not exists (select 1 from public.categories c where c.id = v_category))
     or not (v_tags <@ c_tags)
     or jsonb_typeof(v_sizes) <> 'array' or jsonb_array_length(v_sizes) > 10
     or jsonb_typeof(v_toppings) <> 'array' or jsonb_array_length(v_toppings) > 20 then
    raise exception 'invalid_food' using errcode = '22023';
  end if;

  -- 2. Đọc size và topping; tên không rỗng, không trùng; giá hợp lệ;
  --    có size thì đúng một size mặc định.
  drop table if exists pg_temp._sizes, pg_temp._toppings;
  begin
    create temp table _sizes on commit drop as
    select ord::smallint as sort_order,
           nullif(e ->> 'id', '')::bigint as id,
           trim(coalesce(e ->> 'name', '')) as name,
           coalesce((e ->> 'priceDelta')::integer, 0) as price_delta,
           coalesce((e ->> 'isDefault')::boolean, false) as is_default
    from jsonb_array_elements(v_sizes) with ordinality as x(e, ord);

    create temp table _toppings on commit drop as
    select ord::smallint as sort_order,
           nullif(e ->> 'id', '')::bigint as id,
           trim(coalesce(e ->> 'name', '')) as name,
           coalesce((e ->> 'price')::integer, 0) as price
    from jsonb_array_elements(v_toppings) with ordinality as x(e, ord);
  exception when others then
    raise exception 'invalid_food' using errcode = '22023';
  end;

  if exists (select 1 from _sizes where length(name) not between 1 and 40 or price_delta not between 0 and c_max_price)
     or (select count(*) from _sizes) <> (select count(distinct lower(name)) from _sizes)
     or ((select count(*) from _sizes) > 0 and (select count(*) from _sizes where is_default) <> 1)
     or exists (select 1 from _toppings where length(name) not between 1 and 40 or price not between 0 and c_max_price)
     or (select count(*) from _toppings) <> (select count(distinct lower(name)) from _toppings) then
    raise exception 'invalid_food' using errcode = '22023';
  end if;

  -- 3. Ghi món. Sửa thì món phải thuộc quán mình.
  if v_id is null then
    insert into public.foods
      (restaurant_id, category_id, name, description, image_url, base_price, calories,
       tags, stock, has_spice, is_available, sort_order)
    values
      (v_restaurant, v_category, v_name, v_desc, v_image, v_price, v_calories,
       v_tags, v_stock, v_has_spice, v_available,
       coalesce((select max(f.sort_order) + 1 from public.foods f where f.restaurant_id = v_restaurant), 0))
    returning id into v_id;
    v_created := true;
  else
    update public.foods
    set category_id = v_category, name = v_name, description = v_desc, image_url = v_image,
        base_price = v_price, calories = v_calories, tags = v_tags, stock = v_stock,
        has_spice = v_has_spice, is_available = v_available
    where id = v_id and restaurant_id = v_restaurant;
    if not found then
      raise exception 'food_not_found' using errcode = 'P0001';
    end if;
  end if;

  -- id size/topping gửi lên phải thuộc chính món này.
  if exists (select 1 from _sizes s where s.id is not null and not exists (
               select 1 from public.food_sizes fs where fs.id = s.id and fs.food_id = v_id))
     or exists (select 1 from _toppings t where t.id is not null and not exists (
               select 1 from public.food_toppings ft where ft.id = t.id and ft.food_id = v_id)) then
    raise exception 'invalid_food' using errcode = '22023';
  end if;

  -- 4. Đồng bộ size: xóa size bị bỏ, bỏ cờ mặc định cũ, sửa size giữ lại, thêm size mới.
  --    Đổi tên tạm để tránh vướng unique (food_id, name) khi hai size đổi tên cho nhau.
  delete from public.food_sizes fs
  where fs.food_id = v_id and fs.id not in (select s.id from _sizes s where s.id is not null);
  update public.food_sizes set is_default = false, name = '~' || id where food_id = v_id;
  update public.food_sizes fs
  set name = s.name, price_delta = s.price_delta, is_default = s.is_default, sort_order = s.sort_order
  from _sizes s where fs.id = s.id;
  insert into public.food_sizes (food_id, name, price_delta, is_default, sort_order)
  select v_id, s.name, s.price_delta, s.is_default, s.sort_order from _sizes s where s.id is null;

  -- 5. Đồng bộ topping theo cùng cách.
  delete from public.food_toppings ft
  where ft.food_id = v_id and ft.id not in (select t.id from _toppings t where t.id is not null);
  update public.food_toppings set name = '~' || id where food_id = v_id;
  update public.food_toppings ft
  set name = t.name, price = t.price, sort_order = t.sort_order
  from _toppings t where ft.id = t.id;
  insert into public.food_toppings (food_id, name, price, sort_order)
  select v_id, t.name, t.price, t.sort_order from _toppings t where t.id is null;

  return jsonb_build_object('id', v_id, 'created', v_created);
end;
$$;

revoke execute on function public.save_food(jsonb) from public, anon;
grant execute on function public.save_food(jsonb) to authenticated;

-- ── delete_food(food_id): Xóa món của quán mình ─────────────────────────────
-- Đơn cũ giữ bản chụp (order_items.food_id thành null); dòng giỏ hàng của món
-- bị xóa theo (cart_items ON DELETE CASCADE).
-- Lỗi (message): not_authenticated · food_not_found
create or replace function public.delete_food(food_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  delete from public.foods f
  using public.restaurants r
  where f.id = delete_food.food_id
    and r.id = f.restaurant_id
    and r.owner_id = auth.uid();

  if not found then
    raise exception 'food_not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.delete_food(bigint) from public, anon;
grant execute on function public.delete_food(bigint) to authenticated;
