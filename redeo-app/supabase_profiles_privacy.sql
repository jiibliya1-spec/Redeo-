-- Profiles privacy: hide email/phone from other users.
-- Run once in Supabase Dashboard > SQL Editor (project Redeo).

create or replace view public.public_profiles with (security_invoker = false) as
  select id, name, avatar, bio, role, is_verified, verification_status,
         passenger_verified, rating, trips_count, created_at
  from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

revoke select on public.profiles from anon;
