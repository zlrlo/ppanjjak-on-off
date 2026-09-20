create extension if not exists pgcrypto;

create type member_role as enum ('admin', 'member');
create type settlement_status as enum ('unpaid', 'paid');

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  display_name text not null,
  role member_role not null default 'member',
  hourly_rate_won integer not null default 0 check (hourly_rate_won >= 0),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, display_name)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table login_attempts (
  id bigint generated always as identity primary key,
  member_id uuid references members(id) on delete cascade,
  ip_hash text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  hourly_rate_snapshot_won integer not null check (hourly_rate_snapshot_won >= 0),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index one_open_shift_per_member on shifts(member_id) where ended_at is null;
create index shifts_household_started_idx on shifts(household_id, started_at desc);

create table baby_status (
  household_id uuid primary key references households(id) on delete cascade,
  is_sleeping boolean not null default false,
  sleep_changed_at timestamptz not null default now(),
  last_fed_at timestamptz,
  updated_by uuid references members(id),
  updated_at timestamptz not null default now()
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  year_month text not null check (year_month ~ '^\d{4}-\d{2}$'),
  status settlement_status not null default 'unpaid',
  paid_minutes integer,
  paid_amount_won integer,
  paid_at timestamptz,
  paid_by uuid references members(id),
  unique (household_id, member_id, year_month)
);

create table audit_logs (
  id bigint generated always as identity primary key,
  household_id uuid not null references households(id) on delete cascade,
  actor_id uuid references members(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

alter table households enable row level security;
alter table members enable row level security;
alter table sessions enable row level security;
alter table login_attempts enable row level security;
alter table shifts enable row level security;
alter table baby_status enable row level security;
alter table settlements enable row level security;
alter table audit_logs enable row level security;

-- The browser never receives a Supabase key. The Next.js server uses the service role.
