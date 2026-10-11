-- ============================================================
-- Redeo — COMPLETE Supabase setup (schema + security + storage + realtime)
-- One idempotent file. Run once in Supabase → SQL Editor on an empty project.
-- Replaces: supabase_complete_schema.sql, kyc_migration.sql, supabase_enable_realtime.sql,
--           supabase_security_hardening.sql and all fix_*.sql files.
--
-- After running, make yourself admin (once):
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'submitted', 'approved', 'verified', 'rejected')),
  passenger_verified BOOLEAN DEFAULT false,
  passenger_verification_status TEXT DEFAULT 'unverified',
  rating NUMERIC DEFAULT 5.0,
  trips_count INTEGER DEFAULT 0,
  ai_verification_score NUMERIC(5,1),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicle_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  plate_number TEXT,
  seats INTEGER DEFAULT 4,
  image TEXT,
  type TEXT DEFAULT 'sedan',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON public.vehicle_profiles(driver_id);

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicle_profiles(id) ON DELETE SET NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  available_seats INTEGER NOT NULL DEFAULT 1 CHECK (available_seats >= 0),
  total_seats INTEGER NOT NULL DEFAULT 3,
  distance TEXT,
  duration TEXT,
  status TEXT DEFAULT 'upcoming',
  route TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{"Air Conditioning"}',
  vehicle_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trips_from ON public.trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON public.trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON public.trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seats INTEGER NOT NULL DEFAULT 1 CHECK (seats >= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_price NUMERIC,
  passenger_name TEXT,
  passenger_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON public.bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON public.bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  image_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS public.verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  url TEXT,
  storage_path TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  ai_quality_score NUMERIC(5,1),
  blur_score NUMERIC(5,1),
  brightness_score NUMERIC(5,1),
  fraud_score NUMERIC(5,1),
  face_match_score NUMERIC(5,1),
  extracted_text TEXT,
  ai_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, doc_type)               -- the app upserts with onConflict 'user_id,doc_type'
);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON public.verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verifications(status);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (reviewer_id <> reviewee_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON public.support_tickets(status);

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'fr',
  dark_mode BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. is_admin(): the ONLY source of truth for admin rights
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 3. TRIGGERS
-- ============================================================
-- 3a. New auth user -> profile + settings. Role from metadata can NEVER be admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone, role, is_verified, verification_status, avatar)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3b. updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','trips','bookings','verifications','support_tickets','user_settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON public.%1$I', tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', tbl);
  END LOOP;
END $$;

-- 3c. PROFILES: users cannot self-verify, self-promote or edit rating
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- SQL editor / service role (no JWT user), admins, and trusted nested triggers may change anything
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  NEW.id                            := OLD.id;
  NEW.is_verified                   := OLD.is_verified;
  NEW.rating                        := OLD.rating;
  NEW.trips_count                   := OLD.trips_count;
  NEW.passenger_verified            := OLD.passenger_verified;
  NEW.passenger_verification_status := OLD.passenger_verification_status;
  NEW.ai_verification_score         := OLD.ai_verification_score;
  NEW.verified_at                   := OLD.verified_at;

  IF OLD.role = 'admin' OR NEW.role NOT IN ('passenger', 'driver') THEN
    NEW.role := OLD.role;                 -- nobody can grant themselves admin
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

-- 3d. Driver rating after a review
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_driver_rating ON public.reviews;
CREATE TRIGGER trg_update_driver_rating
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating();

-- 3e. BOOKINGS: server-side validation + atomic seat accounting.
--     (The app already creates the notifications itself, so there are no notification triggers here.)
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
    IF auth.uid() = OLD.driver_id THEN
      NULL;                                                -- the driver decides
    ELSIF auth.uid() = OLD.passenger_id THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Passengers can only cancel a booking';
      END IF;
    ELSE
      RAISE EXCEPTION 'Not allowed';
    END IF;

    SELECT * INTO t FROM public.trips WHERE id = OLD.trip_id FOR UPDATE;

    IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
      IF OLD.seats > COALESCE(t.available_seats, 0) THEN
        RAISE EXCEPTION 'Not enough available seats';
      END IF;
      UPDATE public.trips SET available_seats = available_seats - OLD.seats WHERE id = OLD.trip_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status <> 'confirmed' THEN
      UPDATE public.trips
        SET available_seats = LEAST(COALESCE(total_seats, available_seats + OLD.seats), available_seats + OLD.seats)
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

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings    ENABLE ROW LEVEL SECURITY;

-- profiles (names/avatars/ratings are public: the app shows drivers to visitors)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND role IN ('passenger', 'driver') AND is_verified IS NOT TRUE);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "profiles_delete_own_or_admin" ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- vehicle_profiles
DROP POLICY IF EXISTS "vehicles_select_all" ON public.vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON public.vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_update_own" ON public.vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_delete_own" ON public.vehicle_profiles;
CREATE POLICY "vehicles_select_all" ON public.vehicle_profiles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert_own" ON public.vehicle_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "vehicles_update_own" ON public.vehicle_profiles FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "vehicles_delete_own" ON public.vehicle_profiles FOR DELETE TO authenticated USING (auth.uid() = driver_id);

-- trips
DROP POLICY IF EXISTS "trips_select_all" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
DROP POLICY IF EXISTS "trips_update_admin" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_admin" ON public.trips;
CREATE POLICY "trips_select_all" ON public.trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_own" ON public.trips FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "trips_update_own" ON public.trips FOR UPDATE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "trips_delete_own" ON public.trips FOR DELETE TO authenticated USING (auth.uid() = driver_id);
CREATE POLICY "trips_update_admin" ON public.trips FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "trips_delete_admin" ON public.trips FOR DELETE TO authenticated USING (public.is_admin());

-- bookings
DROP POLICY IF EXISTS "bookings_select_participant" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_passenger" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_participant" ON public.bookings;
CREATE POLICY "bookings_select_participant" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = passenger_id OR auth.uid() = driver_id OR public.is_admin());
CREATE POLICY "bookings_insert_passenger" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "bookings_update_participant" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- messages
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin());
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

-- notifications: nobody can spam strangers
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_related" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_related" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.bookings b
               WHERE (b.passenger_id = auth.uid() AND b.driver_id = notifications.user_id)
                  OR (b.driver_id = auth.uid() AND b.passenger_id = notifications.user_id))
    OR EXISTS (SELECT 1 FROM public.messages m
               WHERE m.sender_id = auth.uid() AND m.receiver_id = notifications.user_id)
  );
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- verifications (KYC): private to owner + admin; owner can never approve
DROP POLICY IF EXISTS "verifications_select_own_or_admin" ON public.verifications;
DROP POLICY IF EXISTS "verifications_insert_own" ON public.verifications;
DROP POLICY IF EXISTS "verifications_update_own" ON public.verifications;
DROP POLICY IF EXISTS "verifications_update_admin" ON public.verifications;
CREATE POLICY "verifications_select_own_or_admin" ON public.verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "verifications_insert_own" ON public.verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'uploaded'));
CREATE POLICY "verifications_update_own" ON public.verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'uploaded'));
CREATE POLICY "verifications_update_admin" ON public.verifications FOR UPDATE TO authenticated USING (public.is_admin());

-- reviews
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- support tickets: visitors can write, only owner + admin can read, only admin can answer
DROP POLICY IF EXISTS "support_select_own_or_admin" ON public.support_tickets;
DROP POLICY IF EXISTS "support_insert_any" ON public.support_tickets;
DROP POLICY IF EXISTS "support_update_admin" ON public.support_tickets;
CREATE POLICY "support_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "support_insert_any" ON public.support_tickets FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "support_update_admin" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_admin());

-- user settings
DROP POLICY IF EXISTS "settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "settings_update_own" ON public.user_settings;
CREATE POLICY "settings_select_own" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "settings_insert_own" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "settings_update_own" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============================================================
-- 5. TABLE PRIVILEGES (defense in depth on top of RLS)
-- ============================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.profiles, public.trips, public.vehicle_profiles, public.reviews TO anon;
GRANT INSERT ON public.support_tickets TO anon;

-- ============================================================
-- 6. STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars',             'avatars',             true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('chat-images',         'chat-images',         true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('support-screenshots', 'support-screenshots', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('documents',           'documents',           false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "support_screenshots_read" ON storage.objects;
DROP POLICY IF EXISTS "support_screenshots_upload" ON storage.objects;
DROP POLICY IF EXISTS "documents_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "kyc_user_upload" ON storage.objects;

-- avatars: path is "<uid>/..." or "<uid>.<ext>"
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR name LIKE auth.uid()::text || '.%'));
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR name LIKE auth.uid()::text || '.%'));
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR name LIKE auth.uid()::text || '.%'));

CREATE POLICY "chat_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "chat_images_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "support_screenshots_read" ON storage.objects FOR SELECT USING (bucket_id = 'support-screenshots');
CREATE POLICY "support_screenshots_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-screenshots');

-- documents (KYC) are PRIVATE: only the owner's folder, plus admins for review
CREATE POLICY "documents_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "documents_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

-- ============================================================
-- 7. REALTIME
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','verifications','trips','bookings','messages','notifications','support_tickets'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- DONE. Next: sign up in the app, then run the UPDATE ... SET role = 'admin' line at the top.
-- ============================================================
