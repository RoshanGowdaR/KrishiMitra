-- Run this in Supabase SQL Editor.
-- Adds admin authority, richer reports, and admin custom scheme metadata.

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_uid text not null,
  target_uid text not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_uid <> target_uid)
);

create table if not exists public.custom_schemes (
  id text primary key,
  name text not null,
  description text not null,
  language text not null default 'en',
  deadline text,
  ministry text,
  created_at timestamptz not null default now()
);

alter table if exists public.users
  add column if not exists suspension_until timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists moderation_updated_at timestamptz default now();

alter table if exists public.user_reports
  add column if not exists report_type text default 'platform_issue',
  add column if not exists screenshot_url text,
  add column if not exists target_user_id uuid,
  add column if not exists admin_reply text,
  add column if not exists handled_by_uid text,
  add column if not exists resolved_at timestamptz;

alter table if exists public.custom_schemes
  add column if not exists youtube_url text,
  add column if not exists created_by_uid text;

create index if not exists idx_users_suspension_until on public.users(suspension_until);
create index if not exists idx_user_reports_report_type on public.user_reports(report_type);
create index if not exists idx_user_reports_target_user_id on public.user_reports(target_user_id);
create index if not exists idx_custom_schemes_created_at on public.custom_schemes(created_at);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'email'
  ) then
    update public.users
    set role = 'admin'
    where lower(email) = 'gowdaroshan49@gmail.com';
  end if;
exception
  when others then
    null;
end
$$;
