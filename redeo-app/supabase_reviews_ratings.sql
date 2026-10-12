-- Real ratings: users start with NO rating; it only appears after real reviews.
-- Applied to the Redeo project (fxedvtmzqjgzvplclhza).

alter table public.profiles alter column rating drop default;
alter table public.profiles alter column rating drop not null;
alter table public.profiles add column if not exists rating_count integer not null default 0;

-- Recompute rating from real reviews only (NULL when there are none)
create or replace function public.recompute_user_rating(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set
    rating = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.reviewee_id = p_user),
    rating_count = (select count(*) from public.reviews r where r.reviewee_id = p_user)
  where p.id = p_user;
end $$;

create or replace function public.update_driver_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT','UPDATE') then perform public.recompute_user_rating(new.reviewee_id); end if;
  if tg_op in ('UPDATE','DELETE') then perform public.recompute_user_rating(old.reviewee_id); end if;
  return null;
end $$;

drop trigger if exists trg_update_driver_rating on public.reviews;
create trigger trg_update_driver_rating after insert or update or delete on public.reviews
  for each row execute function public.update_driver_rating();

-- Users cannot edit their own rating numbers
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or pg_trigger_depth() > 1 or public.is_admin() then return new; end if;
  new.id := old.id;
  new.is_verified := old.is_verified;
  new.rating := old.rating;
  new.rating_count := old.rating_count;
  new.trips_count := old.trips_count;
  new.passenger_verified := old.passenger_verified;
  new.passenger_verification_status := old.passenger_verification_status;
  new.ai_verification_score := old.ai_verification_score;
  new.verified_at := old.verified_at;
  if old.role = 'admin' or new.role not in ('passenger','driver') then new.role := old.role; end if;
  if new.verification_status in ('approved','verified','rejected') then new.verification_status := old.verification_status; end if;
  return new;
end $$;

-- Only real, confirmed, already-departed trips can be reviewed; one review per booking per reviewer
create unique index if not exists reviews_one_per_booking_reviewer on public.reviews (booking_id, reviewer_id);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    join public.trips t on t.id = b.trip_id
    where b.id = reviews.booking_id
      and b.trip_id = reviews.trip_id
      and b.status = 'confirmed'
      and t.departure_date::date <= current_date
      and ((b.passenger_id = reviewer_id and b.driver_id = reviewee_id)
        or (b.driver_id = reviewer_id and b.passenger_id = reviewee_id))
  )
);

-- Existing profiles: rating only if real reviews exist
update public.profiles p set
  rating = (select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id = p.id),
  rating_count = (select count(*) from public.reviews r where r.reviewee_id = p.id);

create or replace view public.public_profiles as
  select id, name, avatar, bio, role, is_verified, verification_status, passenger_verified,
         rating, trips_count, created_at, rating_count
  from public.profiles;
