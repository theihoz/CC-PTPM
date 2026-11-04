-- ============================================================================
-- 0002 · Hồ sơ người dùng (profiles), tự tạo khi đăng ký
-- ----------------------------------------------------------------------------
-- Chạy trong Supabase SQL Editor sau migration thực đơn. Chạy lại an toàn.
-- Mỗi tài khoản trong auth.users có đúng một dòng profiles cùng id.
-- ============================================================================

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '' check (length(full_name) <= 100),
  phone            text not null default '' check (phone = '' or phone ~ '^0[35789][0-9]{8}$'),
  default_address  text not null default '' check (length(default_address) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.profiles is 'Hồ sơ người dùng, 1–1 với auth.users. Tự tạo bởi trigger khi đăng ký.';
comment on column public.profiles.phone is 'Số di động Việt Nam dạng 0xxxxxxxxx (10 số), hoặc rỗng.';
comment on column public.profiles.default_address is 'Địa chỉ giao hàng mặc định, tự điền ở trang Checkout.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Tự tạo hồ sơ khi có tài khoản mới ───────────────────────────────────────
-- Họ tên và số điện thoại lấy từ metadata lúc đăng ký. Metadata do người dùng
-- tự gửi lên nên chỉ dùng để điền sẵn hồ sơ, không bao giờ dùng để phân quyền.
-- Số điện thoại sai định dạng thì bỏ qua thay vì làm hỏng việc đăng ký.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100);
  v_phone text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');
begin
  if v_phone !~ '^0[35789][0-9]{8}$' then
    v_phone := '';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (new.id, v_name, v_phone)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Hàm chỉ dành cho trigger; không ai gọi trực tiếp được qua API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security: chỉ chủ tài khoản đọc và sửa hồ sơ của mình ─────────
alter table public.profiles enable row level security;

drop policy if exists "Hồ sơ: chủ tài khoản được đọc" on public.profiles;
create policy "Hồ sơ: chủ tài khoản được đọc" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Hồ sơ: chủ tài khoản được sửa" on public.profiles;
create policy "Hồ sơ: chủ tài khoản được sửa" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Khách chưa đăng nhập không có quyền gì. Người đã đăng nhập chỉ được đọc và
-- sửa ba cột thông tin; không tự tạo hay xóa hồ sơ, không đổi id/thời gian.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, default_address) on public.profiles to authenticated;

-- Tạo hồ sơ cho các tài khoản đã đăng ký trước khi có migration này.
insert into public.profiles (id, full_name)
select u.id, left(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), 100)
from auth.users u
on conflict (id) do nothing;
