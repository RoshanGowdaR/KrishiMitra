-- Run in Supabase SQL editor before using Labour features.

create table if not exists public.labour_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  labour_needed integer not null check (labour_needed > 0),
  pay_per_person numeric(12,2) not null check (pay_per_person > 0),
  work_description text not null,
  hours_required numeric(6,2) not null check (hours_required > 0),
  location text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.labour_acceptances (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.labour_requests(id) on delete cascade,
  labour_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'accepted',
  cancel_reason text,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, labour_user_id)
);

create index if not exists idx_labour_requests_requester on public.labour_requests(requester_id);
create index if not exists idx_labour_requests_status on public.labour_requests(status);
create index if not exists idx_labour_acceptances_request on public.labour_acceptances(request_id);
create index if not exists idx_labour_acceptances_labour on public.labour_acceptances(labour_user_id);
create index if not exists idx_labour_acceptances_status on public.labour_acceptances(status);
