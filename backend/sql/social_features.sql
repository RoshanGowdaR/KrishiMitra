-- Run this in Supabase SQL editor.
-- Adds user UID/profile extensions, friendships, encrypted chat, reports, and admin custom schemes.

alter table if exists public.users
  add column if not exists user_uid text unique,
  add column if not exists role text default 'farmer',
  add column if not exists account_status text default 'active',
  add column if not exists profile_photo_url text,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_users_uid on public.users(user_uid);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_status on public.users(account_status);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_uid text not null,
  target_uid text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_uid <> target_uid),
  constraint friendships_unique_pair unique (requester_uid, target_uid)
);

create index if not exists idx_friendships_requester on public.friendships(requester_uid);
create index if not exists idx_friendships_target on public.friendships(target_uid);
create index if not exists idx_friendships_status on public.friendships(status);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_uid text not null,
  receiver_uid text not null,
  cipher_text text not null,
  media_url text,
  media_type text default 'none',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_dm_sender_receiver on public.direct_messages(sender_uid, receiver_uid);
create index if not exists idx_dm_created_at on public.direct_messages(created_at);
create index if not exists idx_dm_expires_at on public.direct_messages(expires_at);

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

create index if not exists idx_user_reports_target on public.user_reports(target_uid);
create index if not exists idx_user_reports_reporter on public.user_reports(reporter_uid);
create index if not exists idx_user_reports_status on public.user_reports(status);

create table if not exists public.custom_schemes (
  id text primary key,
  name text not null,
  description text not null,
  language text not null default 'en',
  deadline text,
  ministry text,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_schemes_language on public.custom_schemes(language);

-- Optional: set one admin account by email once user row exists.
-- update public.users set role = 'admin' where email = 'gowdaroshan49@gmail.com';
