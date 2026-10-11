-- ============================================================
-- Redeo — Security hardening (single, idempotent migration)
-- Run the ENTIRE file once in Supabase → SQL Editor, or via apply_migration.
-- Replaces the unsafe policies from supabase_complete_schema.sql / fix_*.sql
-- ============================================================

-- 0. Extra columns the app already reads ---------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passenger_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passenger_verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 1. is_admin(): the ONLY source of truth for admin rights ---------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- To create an admin (run manually, once, with your own email):
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';

-- 2. New users can never become admin through signup metadata -------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_verified, verification_status, avatar)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    CASE WHEN new.raw_user_meta_data->>'role' = 'driver' THEN 'driver' ELSE 'passenger' END,
    false,
    'unverified',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (id) VALUES (new.id) ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- 3. PROFILES: users cannot self-verify, self-promote or edit rating ------
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- SQL editor / service role (no JWT user) and admins may change anything
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.id                            := OLD.id;
  NEW.is_verified                   := OLD.is_verified;
  NEW.rating                        := OLD.rating;
  NEW.trips_count                   := OLD.trips_count;
  NEW.passenger_verified            := OLD.passenger_verified;
  NEW.passenger_verification_status := OLD.passenger_verification_status;

  IF NEW.role NOT IN ('passenger', 'driver') THEN
    NEW.role := OLD.role;                 -- nobody can grant themselves admin
  END IF;
  IF OLD.role = 'admin' THEN
    NEW.role := 'admin';
  END IF;
  IF NEW.verification_status IN ('approved', 'verified', 'rejected') THEN
    NEW.verification_status := OLD.verification_status;   -- only admins decide
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (public.is_admin());

-- 4. VERIFICATIONS (KYC): private to owner + admin ------------------------
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verifications_select_all"   ON public.verifications;
DROP POLICY IF EXISTS "verifications_select_own"   ON public.verifications;
DROP POLICY IF EXISTS "verifications_select_admin" ON public.verifications;
DROP POLICY IF EXISTS "verifications_insert_own"   ON public.verifications;
DROP POLICY IF EXISTS "verifications_update_all"   ON public.verifications;
DROP POLICY IF EXISTS "verifications_update_own"   ON public.verifications;
DROP POLICY IF EXISTS "verifications_update_admin" ON public.verifications;

CREATE POLICY "verifications_select_own_or_admin" ON public.verifications
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "verifications_insert_own" ON public.verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'uploaded'));

-- owner may only re-upload (status stays pending/uploaded); never approve
CREATE POLICY "verifications_update_own" ON public.verifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'uploaded'));

CREATE POLICY "verifications_update_admin" ON public.verifications
  FOR UPDATE USING (public.is_admin());

-- 5. NOTIFICATIONS: no spam to strangers ----------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_insert_any" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_related" ON public.notifications;
CREATE POLICY "notifications_insert_related" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid()
      OR public.is_admin()
      OR EXISTS (SELECT 1 FROM public.bookings b
                 WHERE (b.passenger_id = auth.uid() AND b.driver_id = notifications.user_id)
                    OR (b.driver_id = auth.uid() AND b.passenger_id = notifications.user_id))
    )
  );

-- 6. STORAGE: private 'documents' bucket ----------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'documents';

DROP POLICY IF EXISTS "documents_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own"   ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own_or_admin" ON storage.objects;

CREATE POLICY "documents_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents'
         AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- 7. BOOKINGS: server-side validation + atomic seat accounting -------------
UPDATE public.bookings b SET driver_id = t.driver_id
  FROM public.trips t WHERE b.trip_id = t.id AND b.driver_id IS NULL;

CREATE OR REPLACE FUNCTION public.bookings_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trips%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;          -- service role

  SELECT * INTO t FROM public.trips WHERE id = NEW.trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF t.status IS NOT NULL AND t.status NOT IN ('upcoming', 'active') THEN
    RAISE EXCEPTION 'This trip is no longer available';
  END IF;
  IF t.driver_id = NEW.passenger_id THEN RAISE EXCEPTION 'You cannot book your own trip'; END IF;
  IF NEW.seats IS NULL OR NEW.seats < 1 THEN RAISE EXCEPTION 'Invalid number of seats'; END IF;
  IF NEW.seats > COALESCE(t.available_seats, 0) THEN RAISE EXCEPTION 'Not enough available seats'; END IF;

  NEW.driver_id   := t.driver_id;                          -- never trust the client
  NEW.total_price := COALESCE(t.price, 0) * NEW.seats;     -- never trust the client
  NEW.status      := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_before_insert ON public.bookings;
CREATE TRIGGER trg_bookings_before_insert
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_before_insert();

CREATE OR REPLACE FUNCTION public.bookings_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trips%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN RETURN NEW; END IF;

  -- immutable fields
  NEW.trip_id := OLD.trip_id; NEW.passenger_id := OLD.passenger_id;
  NEW.driver_id := OLD.driver_id; NEW.seats := OLD.seats; NEW.total_price := OLD.total_price;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.passenger_id AND auth.uid() <> OLD.driver_id THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Passengers can only cancel a booking';
      END IF;
    ELSIF auth.uid() <> OLD.driver_id THEN
      RAISE EXCEPTION 'Not allowed';
    END IF;

    SELECT * INTO t FROM public.trips WHERE id = OLD.trip_id FOR UPDATE;

    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
      IF OLD.seats > COALESCE(t.available_seats, 0) THEN
        RAISE EXCEPTION 'Not enough available seats';
      END IF;
      UPDATE public.trips SET available_seats = available_seats - OLD.seats WHERE id = OLD.trip_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE public.trips SET available_seats = LEAST(COALESCE(total_seats, available_seats + OLD.seats), available_seats + OLD.seats)
        WHERE id = OLD.trip_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_before_update ON public.bookings;
CREATE TRIGGER trg_bookings_before_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_before_update();

-- 8. Admin read access for the admin panel --------------------------------
DROP POLICY IF EXISTS "bookings_select_admin" ON public.bookings;
CREATE POLICY "bookings_select_admin" ON public.bookings FOR SELECT USING (public.is_admin());
