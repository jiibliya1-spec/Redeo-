-- ============================================================
-- WansniAuto — COMPLETE FIX SQL (Run once in Supabase SQL Editor)
-- ============================================================
-- Fixes: Storage buckets, RLS, Verifications, Notifications,
--        Trips, Chat, Admin approval, Realtime, Triggers
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents',        'documents',        true, 10485760,
   ARRAY['image/jpeg','image/png','image/jpg','image/webp','application/pdf']),
  ('avatars',          'avatars',          true, 5242880,
   ARRAY['image/jpeg','image/png','image/jpg','image/webp']),
  ('chat-images',      'chat-images',      true, 5242880,
   ARRAY['image/jpeg','image/png','image/jpg','image/webp']),
  ('vehicle-photos',   'vehicle-photos',   true, 10485760,
   ARRAY['image/jpeg','image/png','image/jpg','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────
-- 2. STORAGE POLICIES  (drop all then recreate cleanly)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read for all buckets
CREATE POLICY "storage_public_read" ON storage.objects
  FOR SELECT TO public USING (true);

-- Authenticated upload to their own userId folder
CREATE POLICY "storage_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Authenticated update own files
CREATE POLICY "storage_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Authenticated delete own files
CREATE POLICY "storage_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ─────────────────────────────────────────────────────────────
-- 3. PROFILES TABLE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname); END LOOP;
END $$;

-- Anyone can read any profile (needed for trip listings, chat)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

-- User can insert their own profile
CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User can update own profile
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can update any profile (for verification approval)
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'
          OR p.email ILIKE '%admin%'
          OR p.email ILIKE '%wansniauto%')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. VERIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────

-- Ensure the table has all needed columns
ALTER TABLE verifications
  ADD COLUMN IF NOT EXISTS public_url    TEXT,
  ADD COLUMN IF NOT EXISTS storage_path  TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Unique constraint so upsert works per user+doc_type
ALTER TABLE verifications
  DROP CONSTRAINT IF EXISTS verifications_user_doc_unique;
ALTER TABLE verifications
  ADD CONSTRAINT verifications_user_doc_unique UNIQUE (user_id, doc_type);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'verifications'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON verifications', pol.policyname); END LOOP;
END $$;

-- Users manage their own verifications
CREATE POLICY "verif_user_all" ON verifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can read and update all verifications
CREATE POLICY "verif_admin_read" ON verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'
          OR p.email ILIKE '%admin%'
          OR p.email ILIKE '%wansniauto%')
    )
  );

CREATE POLICY "verif_admin_update" ON verifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'
          OR p.email ILIKE '%admin%'
          OR p.email ILIKE '%wansniauto%')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL DEFAULT '',
  data        JSONB,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'notifications'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON notifications', pol.policyname); END LOOP;
END $$;

-- Users see own notifications
CREATE POLICY "notif_user_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users mark read / delete their own
CREATE POLICY "notif_user_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notif_user_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (admin → user)
CREATE POLICY "notif_auth_insert" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. TRIPS TABLE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'trips'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON trips', pol.policyname); END LOOP;
END $$;

-- Anyone can view trips (needed for search)
CREATE POLICY "trips_public_read" ON trips
  FOR SELECT USING (true);

-- Driver can manage own trips
CREATE POLICY "trips_driver_all" ON trips
  FOR ALL USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Admin can manage all trips
CREATE POLICY "trips_admin_all" ON trips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR p.email ILIKE '%admin%')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 7. BOOKINGS TABLE
-- ─────────────────────────────────────────────────────────────

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'bookings'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON bookings', pol.policyname); END LOOP;
END $$;

-- Passenger and driver can view their own bookings
CREATE POLICY "bookings_read" ON bookings
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- Passenger can create a booking
CREATE POLICY "bookings_passenger_insert" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

-- Both parties can update (status changes)
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- ─────────────────────────────────────────────────────────────
-- 8. MESSAGES TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  image_url   TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname); END LOOP;
END $$;

-- Can see messages where you are sender or receiver
CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Can send messages (but NOT to yourself)
CREATE POLICY "messages_send" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND sender_id <> receiver_id);

-- Receiver can mark as read
CREATE POLICY "messages_mark_read" ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ─────────────────────────────────────────────────────────────
-- 9. REALTIME — Enable for all key tables
-- ─────────────────────────────────────────────────────────────

-- If supabase_realtime publication exists, add tables to it
DO $$
BEGIN
  -- Try each table separately so one failure doesn't block others
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE verifications;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trips;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  EXCEPTION WHEN others THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 10. AUTO-CREATE PROFILE ON SIGNUP (Auth Trigger)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, phone, role,
    is_verified, verification_status,
    rating, trips_count, avatar, bio,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger'),
    false,
    'unverified',    -- ← always starts as 'unverified' for new accounts
    5.0,
    0,
    CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', NEW.id::text),
    '',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    updated_at = NOW()
  WHERE profiles.name IS NULL OR profiles.name = '';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 11. AUTO-UPDATE updated_at trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
BEGIN
  BEGIN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER verifications_updated_at BEFORE UPDATE ON verifications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER notifications_updated_at BEFORE UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 12. INDEXES for performance
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status   ON verifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read     ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_trips_from_to          ON trips (from_location, to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date             ON trips (departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_driver           ON trips (driver_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo         ON messages (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger     ON bookings (passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver        ON bookings (driver_id);

-- ─────────────────────────────────────────────────────────────
-- 13. FIX EXISTING DATA — Reset wrong verification statuses
-- ─────────────────────────────────────────────────────────────

-- Any profile with verification_status = 'submitted' but NO pending/uploaded verifications
-- → reset to 'unverified' (stale data from old bug)
UPDATE profiles
SET verification_status = 'unverified',
    updated_at = NOW()
WHERE verification_status = 'submitted'
  AND is_verified = false
  AND NOT EXISTS (
    SELECT 1 FROM verifications v
    WHERE v.user_id = profiles.id
      AND v.status IN ('uploaded', 'pending', 'approved', 'verified')
  );

-- Fix verifications that are 'pending' but profile says 'unverified'
-- (Documents were uploaded with wrong status='pending', without going through Submit)
-- → We leave them as-is so admin can still review them
-- But update the profile to 'submitted' so the user sees the correct banner
UPDATE profiles
SET verification_status = 'submitted',
    updated_at = NOW()
WHERE verification_status = 'unverified'
  AND is_verified = false
  AND EXISTS (
    SELECT 1 FROM verifications v
    WHERE v.user_id = profiles.id
      AND v.status = 'pending'
  );

-- ─────────────────────────────────────────────────────────────
-- DONE ✅
-- ─────────────────────────────────────────────────────────────
-- After running this script:
-- 1. The 'documents' bucket will exist and be public
-- 2. All RLS policies are set correctly
-- 3. Notifications table is ready
-- 4. New users always start with verification_status = 'unverified'
-- 5. Upload → status='uploaded', Submit → status='pending', Admin → 'approved'
-- ─────────────────────────────────────────────────────────────
