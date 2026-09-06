-- PantauErupsi Supabase schema
-- Jalankan di SQL Editor Supabase jika memakai backend cloud.

create extension if not exists "pgcrypto";

create table if not exists public.volcanoes (
  id text primary key,
  name text not null,
  slug text unique not null,
  code text not null,
  region text not null,
  lat double precision not null,
  lng double precision not null,
  elevation_m integer,
  activity_level smallint not null check (activity_level between 1 and 4),
  activity_label text not null,
  magma_url text not null,
  cctv_url text not null,
  has_cctv boolean not null default false,
  summary text,
  last_synced_at timestamptz
);

create table if not exists public.volcano_reports (
  id uuid primary key default gen_random_uuid(),
  volcano_id text references public.volcanoes(id) on delete cascade,
  issued_at timestamptz not null,
  summary text not null,
  recommendation text,
  source_url text not null
);

create table if not exists public.cctv_cameras (
  id text primary key,
  volcano_id text references public.volcanoes(id) on delete cascade,
  volcano_code text not null,
  label text not null,
  image_url text not null,
  magma_path text not null,
  updated_at timestamptz
);

create table if not exists public.vona_notices (
  id uuid primary key default gen_random_uuid(),
  volcano_id text references public.volcanoes(id) on delete cascade,
  volcano_name text not null,
  issued_at timestamptz not null,
  ash_height text,
  color_code text,
  summary text not null,
  source_url text not null
);

create table if not exists public.impacts (
  id uuid primary key default gen_random_uuid(),
  volcano_id text references public.volcanoes(id) on delete cascade,
  category text not null check (category in ('airport','health','ash','other')),
  title text not null,
  body text not null,
  status text not null check (status in ('active','resolved','monitoring')),
  source text not null,
  source_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meta jsonb default '{}'::jsonb
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  favorite_volcano_ids text[] not null default '{}',
  min_alert_level smallint not null default 2,
  regions text[] not null default '{}',
  email_digest boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  volcano_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.volcanoes enable row level security;
alter table public.volcano_reports enable row level security;
alter table public.cctv_cameras enable row level security;
alter table public.vona_notices enable row level security;
alter table public.impacts enable row level security;
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit enable row level security;

create policy "Public read volcanoes" on public.volcanoes for select using (true);
create policy "Public read reports" on public.volcano_reports for select using (true);
create policy "Public read cctv" on public.cctv_cameras for select using (true);
create policy "Public read vona" on public.vona_notices for select using (true);
create policy "Public read impacts" on public.impacts for select using (true);

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
