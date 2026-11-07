-- Afrobeats King: online tables (run once in the Supabase SQL editor; safe to re-run).
-- Everything is optional: without these the game runs fully on the phone.
-- Every table starts with abk_ so this game can share a free Supabase project with your other games.
-- Only the server (service role key in Vercel) reads or writes them: row level security is on with no public policies.

-- ───────── money ─────────
create table if not exists public.abk_purchases (
  reference text primary key,              -- payment reference; one grant per reference
  product_id text not null,
  amount_kobo bigint not null,
  email text,
  source text,
  install_id text,
  created_at timestamptz not null default now()
);
create index if not exists abk_purchases_install_idx on public.abk_purchases (install_id);

create table if not exists public.abk_rewards (
  id bigint generated always as identity primary key,
  install_id text,
  gold integer not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists abk_rewards_install_idx on public.abk_rewards (install_id);

-- ───────── invites ─────────
create table if not exists public.abk_referrals (
  referee_install text primary key,         -- each new player counts once
  referrer_install text not null,
  ip text,
  created_at timestamptz not null default now()
);
create table if not exists public.abk_ambassadors (
  code text primary key,                    -- e.g. AMAKA-7Q3K
  install_id text not null unique,
  name text not null,
  camp text,
  created_at timestamptz not null default now()
);

-- ───────── analytics ─────────
create table if not exists public.abk_events (
  id bigint generated always as identity primary key,
  install_id text,
  name text not null,
  props jsonb,
  at timestamptz not null default now()
);
create index if not exists abk_events_name_at_idx on public.abk_events (name, at desc);
create index if not exists abk_events_ad_idx on public.abk_events ((props->>'id')) where name in ('ad_view', 'ad_tap');

-- ───────── leaderboard (one best row per phone) ─────────
create table if not exists public.abk_leaderboard (
  install_id text primary key,
  name text not null,
  label text,
  title text,
  score integer not null,
  week integer,
  level integer,
  updated_at timestamptz not null default now()
);
create index if not exists abk_leaderboard_score_idx on public.abk_leaderboard (score desc);

-- ───────── light multiplayer ─────────
create table if not exists public.abk_presence (
  pid text primary key,                     -- public id (hash of the install id), never the install id
  name text not null,
  label text,
  camp text,
  place text,
  look jsonb,
  level integer,
  updated_at timestamptz not null default now()
);
create index if not exists abk_presence_updated_idx on public.abk_presence (updated_at desc);

create table if not exists public.abk_waves (
  id bigint generated always as identity primary key,
  from_pid text not null,
  from_name text not null,
  from_label text,
  to_pid text not null,
  emoji text not null,
  created_at timestamptz not null default now()
);
create index if not exists abk_waves_to_idx on public.abk_waves (to_pid, created_at desc);

create table if not exists public.abk_board_posts (
  id bigint generated always as identity primary key,
  scope text not null,
  pid text not null,
  name text not null,
  msg text not null,                        -- a key from BOARD_PHRASES in lib/live.ts (no free text)
  created_at timestamptz not null default now()
);
create index if not exists abk_board_scope_idx on public.abk_board_posts (scope, created_at desc);

-- ───────── weekly genre-camp season ─────────
create table if not exists public.abk_season_scores (
  week text not null,                       -- "2026-W45", Monday–Sunday Lagos time
  pid text not null,
  camp text not null,
  pts integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (week, pid)
);
create index if not exists abk_season_week_camp_idx on public.abk_season_scores (week, camp);
create table if not exists public.abk_season_claims (
  week text not null,
  pid text not null,
  created_at timestamptz not null default now(),
  primary key (week, pid)
);

-- ───────── problem reports ─────────
create table if not exists public.abk_bug_reports (
  id bigint generated always as identity primary key,
  install_id text,
  kind text not null default 'other',
  message text not null,
  contact text,
  details jsonb,
  status text not null default 'new',       -- new / seen / fixed
  created_at timestamptz not null default now()
);

-- ───────── advertisers and artists ─────────
create table if not exists public.abk_ad_requests (
  id bigint generated always as identity primary key,
  business text not null,
  contact_name text not null,
  contact text not null,
  package text not null,                    -- song / radio / bridge / sanctuary / concert
  brand_text text,
  link text,                                -- artist's own song link (https)
  message text,
  weeks int not null default 1,
  status text not null default 'new',       -- new / paid / live / done
  paid_ref text,
  amount_paid numeric,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- row level security: on for every table, no public policies (server only)
alter table public.abk_purchases enable row level security;
alter table public.abk_rewards enable row level security;
alter table public.abk_referrals enable row level security;
alter table public.abk_ambassadors enable row level security;
alter table public.abk_events enable row level security;
alter table public.abk_leaderboard enable row level security;
alter table public.abk_presence enable row level security;
alter table public.abk_waves enable row level security;
alter table public.abk_board_posts enable row level security;
alter table public.abk_season_scores enable row level security;
alter table public.abk_season_claims enable row level security;
alter table public.abk_bug_reports enable row level security;
alter table public.abk_ad_requests enable row level security;

-- ───────── views to read in the table editor ─────────
-- Who comes back: new players per day, back the next day, back about a week later.
create or replace view public.abk_retention with (security_invoker = on) as
with first_seen as (
  select install_id, min(at)::date as day0 from public.abk_events where name = 'session_start' and install_id is not null group by install_id
), visits as (
  select distinct install_id, at::date as day from public.abk_events where name = 'session_start' and install_id is not null
)
select f.day0 as start_day,
       count(*) as new_players,
       count(*) filter (where exists (select 1 from visits v where v.install_id = f.install_id and v.day = f.day0 + 1)) as back_day1,
       count(*) filter (where exists (select 1 from visits v where v.install_id = f.install_id and v.day between f.day0 + 6 and f.day0 + 8)) as back_day7
from first_seen f group by f.day0 order by f.day0 desc;

-- How far players get (each milestone counted once per player).
create or replace view public.abk_funnel with (security_invoker = on) as
select name as milestone, count(distinct install_id) as players
from public.abk_events
where name in ('session_start', 'life_start', 'tutorial_done', 'signed', 'release', 'charted', 'level', 'purchase_click', 'purchase_success')
group by name order by players desc;

-- Money in, newest first (game items and ad bookings together).
create or replace view public.abk_revenue with (security_invoker = on) as
select created_at, reference, product_id, amount_kobo / 100.0 as naira, source, email from public.abk_purchases order by created_at desc;

-- Bookings to act on: paid first.
create or replace view public.abk_ad_inbox with (security_invoker = on) as
select id, created_at, status, package, business, contact_name, contact, weeks, brand_text, link, amount_paid, paid_at, message
from public.abk_ad_requests where status in ('new', 'paid') order by (status = 'paid') desc, created_at desc;

-- Views and taps per booking per day (booking #12 shows as id 'b12').
create or replace view public.abk_ad_report with (security_invoker = on) as
select props->>'id' as placement, at::date as day,
       count(*) filter (where name = 'ad_view') as views,
       count(*) filter (where name = 'ad_tap') as taps
from public.abk_events where name in ('ad_view', 'ad_tap') group by 1, 2 order by 2 desc;

-- New problem reports first.
create or replace view public.abk_reports_inbox with (security_invoker = on) as
select id, created_at, kind, message, contact, details->'player'->>'week' as week, details->>'version' as version, details->>'device' as device, details->'errors' as errors
from public.abk_bug_reports where status = 'new' order by created_at desc;

-- ───────── keep the free database small (daily clean-up) ─────────
create extension if not exists pg_cron;
select cron.schedule('abk-cleanup', '23 3 * * *', $$
  delete from public.abk_waves where created_at < now() - interval '7 days';
  delete from public.abk_presence where updated_at < now() - interval '30 days';
  delete from public.abk_board_posts where created_at < now() - interval '30 days';
  delete from public.abk_events where at < now() - interval '180 days' and name not in ('session_start', 'life_start', 'release', 'charted', 'level');
  delete from public.abk_season_scores where updated_at < now() - interval '120 days';
$$);
