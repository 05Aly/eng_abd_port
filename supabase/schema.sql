-- Run in Supabase: SQL Editor > New query > paste > Run.
-- Tables, admin check and Row Level Security. Run storage.sql after this file.

create extension if not exists pgcrypto;

-- 1) Who is an admin. Only rows created by you (step 4 below) count.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) Projects shown on the site
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text check (category is null or char_length(category) <= 60),
  year text check (year is null or char_length(year) <= 10),
  description text check (description is null or char_length(description) <= 2000),
  tech text[] not null default '{}' check (cardinality(tech) <= 12),
  github_url text check (github_url is null or github_url ~* '^https://[^\s]+$'),
  demo_url text check (demo_url is null or demo_url ~* '^https://[^\s]+$'),
  image_path text check (image_path is null or image_path ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
for each row execute function public.set_updated_at();

-- 3) is_admin(): true only when the logged in user exists in public.admins
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 4) Row Level Security (forced, even for the table owner)
alter table public.admins   enable row level security;
alter table public.admins   force  row level security;
alter table public.projects enable row level security;
alter table public.projects force  row level security;

-- Start from zero privileges, then grant only what is needed
revoke all on public.admins   from anon, authenticated;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policy on admins: nobody can add admins through the API.

drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects
  for select to anon, authenticated using (published or public.is_admin());

drop policy if exists "projects insert admin" on public.projects;
create policy "projects insert admin" on public.projects
  for insert to authenticated with check (public.is_admin());

drop policy if exists "projects update admin" on public.projects;
create policy "projects update admin" on public.projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projects delete admin" on public.projects;
create policy "projects delete admin" on public.projects
  for delete to authenticated using (public.is_admin());

-- 5) AFTER you create your user in Auth > Users, make it admin (replace the email):
-- insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';
