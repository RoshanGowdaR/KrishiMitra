-- Run this in Supabase SQL Editor before using Machineries role workflow.

create table if not exists public.machinery_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  farmer_name text not null,
  phone text not null,
  machinery_type text not null,
  hours_required numeric(8,2) not null check (hours_required > 0),
  required_date date not null,
  state text not null,
  district text not null,
  taluk text,
  village text,
  land_area_acres numeric(10,2),
  budget_per_hour numeric(12,2),
  urgency text not null default 'normal',
  work_details text,
  status text not null default 'open' check (status in ('open', 'accepted', 'in_progress', 'fulfilled', 'cancelled')),
  accepted_provider_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.machinery_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.machinery_requests(id) on delete cascade,
  provider_id uuid not null references public.users(id) on delete cascade,
  provider_name text not null,
  provider_phone text not null,
  rate_per_hour numeric(12,2) not null check (rate_per_hour > 0),
  note text,
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index if not exists idx_machinery_requests_requester on public.machinery_requests(requester_id);
create index if not exists idx_machinery_requests_status on public.machinery_requests(status);
create index if not exists idx_machinery_requests_accepted_provider on public.machinery_requests(accepted_provider_id);
create index if not exists idx_machinery_offers_request on public.machinery_offers(request_id);
create index if not exists idx_machinery_offers_provider on public.machinery_offers(provider_id);

alter table public.machinery_requests enable row level security;
alter table public.machinery_offers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_requests' and policyname = 'Read machinery requests'
  ) then
    create policy "Read machinery requests"
    on public.machinery_requests
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_requests' and policyname = 'Insert own machinery requests'
  ) then
    create policy "Insert own machinery requests"
    on public.machinery_requests
    for insert
    to authenticated
    with check (requester_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_requests' and policyname = 'Update requester or accepted provider requests'
  ) then
    create policy "Update requester or accepted provider requests"
    on public.machinery_requests
    for update
    to authenticated
    using (requester_id = auth.uid() or accepted_provider_id = auth.uid() or status = 'open')
    with check (requester_id = auth.uid() or accepted_provider_id = auth.uid() or accepted_provider_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_offers' and policyname = 'Read machinery offers'
  ) then
    create policy "Read machinery offers"
    on public.machinery_offers
    for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_offers' and policyname = 'Insert own machinery offers'
  ) then
    create policy "Insert own machinery offers"
    on public.machinery_offers
    for insert
    to authenticated
    with check (provider_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'machinery_offers' and policyname = 'Update own machinery offers'
  ) then
    create policy "Update own machinery offers"
    on public.machinery_offers
    for update
    to authenticated
    using (provider_id = auth.uid())
    with check (provider_id = auth.uid());
  end if;
end
$$;

-- Keep status constraint in sync for existing tables created by older versions of this script.
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'machinery_requests'
      and c.conname = 'machinery_requests_status_check'
  ) then
    alter table public.machinery_requests drop constraint machinery_requests_status_check;
  end if;

  alter table public.machinery_requests
  add constraint machinery_requests_status_check
  check (status in ('open', 'accepted', 'in_progress', 'fulfilled', 'cancelled'));
exception
  when duplicate_object then
    null;
end
$$;
