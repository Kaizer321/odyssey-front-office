-- ============ TENANTS & USERS ============
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null,
  logo_url text,
  timezone text not null default 'Australia/Sydney',
  job_system text not null default 'servicem8'
    check (job_system in ('servicem8','simpro','none')),
  avg_job_value numeric(10,2) not null default 0,
  monthly_fee numeric(10,2) not null default 0,
  business_hours jsonb not null default '{}'::jsonb,
  service_targets jsonb not null default '{}'::jsonb,
  agent_status text not null default 'active'
    check (agent_status in ('active','paused','error','onboarding')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  role text not null check (role in ('owner','office_manager','admin')),
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  constraint admin_has_no_client check ((role = 'admin') = (client_id is null))
);

-- ============ CORE DATA ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  unique (client_id, phone)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null check (channel in ('call','web_form','email')),
  category text not null check (category in ('urgent','quote','question','booking','spam')),
  outcome text not null check (outcome in
    ('booked','quote_captured','info_provided','transferred','message_taken','spam','missed')),
  is_after_hours boolean not null default false,
  contact_name text,
  contact_phone text,
  contact_address text,
  subject text,
  details text,
  summary text,
  received_at timestamptz not null default now(),
  logged_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  enquiry_id uuid not null unique references public.enquiries(id) on delete cascade,
  retell_call_id text,
  from_number text,
  started_at timestamptz not null,
  duration_seconds int not null default 0,
  answered boolean not null default true,
  handling text not null default 'answer_first'
    check (handling in ('answer_first','overflow','after_hours')),
  transcript jsonb,
  recording_url text,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  enquiry_id uuid references public.enquiries(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  external_job_number text,
  external_url text,
  title text,
  status text not null default 'booked'
    check (status in ('quote','booked','in_progress','completed','cancelled')),
  scheduled_at timestamptz,
  technician text,
  value numeric(10,2),
  created_at timestamptz not null default now()
);

create table public.emergencies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  trigger_phrase text,
  transferred_to text,
  transfer_succeeded boolean not null default true,
  owner_sms_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.post_call_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  event_type text not null check (event_type in
    ('job_created','sms_sent','summary_emailed','reminder_scheduled','transfer','owner_alert')),
  detail text,
  occurred_at timestamptz not null default now()
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  call_id uuid not null references public.calls(id) on delete cascade,
  flagged_by uuid references public.profiles(id) on delete set null,
  source text not null default 'client' check (source in ('client','random_sample')),
  reason text,
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ============ ADMIN / OPS ============
create table public.usage_daily (
  client_id uuid not null references public.clients(id) on delete cascade,
  day date not null,
  retell_minutes numeric(10,2) not null default 0,
  sms_count int not null default 0,
  cost numeric(10,2) not null default 0,
  primary key (client_id, day)
);

create table public.test_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  ran_at timestamptz not null default now(),
  passed boolean not null,
  details text
);

create table public.integration_errors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  source text not null,
  message text not null,
  occurred_at timestamptz not null default now(),
  resolved boolean not null default false
);

create table public.onboarding_phases (
  client_id uuid not null references public.clients(id) on delete cascade,
  phase int not null check (phase between 1 and 6),
  name text not null,
  status text not null default 'pending'
    check (status in ('pending','in_progress','done')),
  completed_at timestamptz,
  primary key (client_id, phase)
);

-- ============ INDEXES ============
create index on public.enquiries (client_id, received_at desc);
create index on public.calls (client_id, started_at desc);
create index on public.jobs (client_id, created_at desc);
create index on public.jobs (enquiry_id);
create index on public.emergencies (client_id, created_at desc);
create index on public.post_call_events (call_id);
create index on public.flags (status, created_at desc);
create index on public.flags (client_id);
create index on public.test_runs (client_id, ran_at desc);
create index on public.integration_errors (client_id, occurred_at desc);
create index on public.profiles (client_id);
