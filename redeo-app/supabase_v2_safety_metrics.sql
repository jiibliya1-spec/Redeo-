-- Redeo v2: women-only trips, meeting point, car plate, search logs, admin metrics
alter table public.trips
  add column if not exists women_only boolean not null default false,
  add column if not exists meeting_point text,
  add column if not exists car_plate text;

create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  from_location text,
  to_location text,
  results_count integer not null default 0
);
alter table public.search_logs enable row level security;
drop policy if exists search_logs_insert on public.search_logs;
create policy search_logs_insert on public.search_logs for insert to anon, authenticated
  with check (results_count >= 0 and (user_id is null or user_id = auth.uid()));
drop policy if exists search_logs_select_admin on public.search_logs;
create policy search_logs_select_admin on public.search_logs for select to authenticated using (public.is_admin());

create or replace function public.admin_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  with t as (select id, driver_id, created_at from trips),
  fb as (select trip_id, min(created_at) first_b from bookings group by trip_id),
  tb as (select t.id, (fb.first_b is not null and fb.first_b <= t.created_at + interval '48 hours') as ok48 from t left join fb on fb.trip_id = t.id),
  d as (select driver_id, created_at, row_number() over (partition by driver_id order by created_at) rn from t),
  d2 as (select a.driver_id, (b.created_at is not null and b.created_at <= a.created_at + interval '14 days') as ok14
         from d a left join d b on b.driver_id = a.driver_id and b.rn = 2 where a.rn = 1),
  s as (select count(*) total, count(*) filter (where results_count > 0) hit from search_logs)
  select jsonb_build_object(
    'trips_total', (select count(*) from t),
    'trips_booked_48h', (select count(*) filter (where ok48) from tb),
    'drivers_total', (select count(*) from d2),
    'drivers_second_14d', (select count(*) filter (where ok14) from d2),
    'searches_total', (select total from s),
    'searches_with_results', (select hit from s)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_metrics() from public, anon;
grant execute on function public.admin_metrics() to authenticated;

-- ── Trip alerts ("notify me when a trip appears") — already applied to the live project ──
create table if not exists public.trip_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  from_location text not null check (char_length(from_location) between 2 and 60),
  to_location text not null check (char_length(to_location) between 2 and 60),
  active boolean not null default true,
  matched_trip_id uuid,
  matched_at timestamptz,
  wa_sent_at timestamptz
);
-- + RLS policies (insert anon/auth, select own/admin, update admin, delete own/admin)
-- + trigger trg_trips_match_alerts -> match_trip_alerts(): marks matching alerts and creates in-app notifications
