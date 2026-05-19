-- ============================================================
-- WansniAuto — Complete Supabase Fix Script
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. CREATE STORAGE BUCKETS ───────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',            'avatars',            true,  5242880, ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('cin-documents',      'cin-documents',      true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf']),
  ('selfies',            'selfies',            true,  5242880, ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('driver-licenses',    'driver-licenses',    true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf']),
  ('vehicle-documents',  'vehicle-documents',  true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf']),
  ('insurance-documents','insurance-documents',true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf']),
  ('vehicle-photos',     'vehicle-photos',     true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('chat-images',        'chat-images',        true,  5242880, ARRAY['image/jpeg','image/png','image/webp','image/jpg'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. STORAGE POLICIES ─────────────────────────────────────

-- Helper: drop existing storage policies to avoid conflicts
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own files
CREATE POLICY "auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read for all buckets
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT TO public
  USING (true);

-- ─── 3. PROFILES TABLE — RLS POLICIES ──────────────────────

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Service role bypass" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view any profile (needed for trip listings)
CREATE POLICY "Public can view profiles" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can update any profile (for verification approval)
CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.email ILIKE '%admin%' OR p.email ILIKE '%wansniauto%')
    )
  );

-- ─── 4. VERIFICATIONS TABLE — RLS POLICIES ──────────────────

DROP POLICY IF EXISTS "Users can view own verifications" ON verifications;
DROP POLICY IF EXISTS "Users can insert own verifications" ON verifications;
DROP POLICY IF EXISTS "Users can update own verifications" ON verifications;
DROP POLICY IF EXISTS "Admin can view all verifications" ON verifications;
DROP POLICY IF EXISTS "Admin can update verifications" ON verifications;

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Users can manage their own verifications
CREATE POLICY "Users manage own verifications" ON verifications
  FOR ALL USING (auth.uid() = user_id);

-- Admin can view and update all verifications
CREATE POLICY "Admin full access verifications" ON verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.email ILIKE '%admin%' OR p.email ILIKE '%wansniauto%')
    )
  );

-- ─── 5. NOTIFICATIONS TABLE — RLS POLICIES ──────────────────

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admin can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see their own notifications
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own (mark read, delete)
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Any authenticated user can insert notifications (for admin→user)
CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- ─── 6. REALTIME — ENABLE FOR ALL TABLES ────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ─── 7. MESSAGES TABLE — RLS POLICIES ───────────────────────

DO $$ BEGIN
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

CREATE POLICY "Users view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

CREATE POLICY "Users update own messages" ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ─── 8. TRIPS — RLS POLICIES ────────────────────────────────

DO $$ BEGIN
  ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Anyone can view trips" ON trips;
DROP POLICY IF EXISTS "Drivers can manage own trips" ON trips;

CREATE POLICY "Anyone can view trips" ON trips
  FOR SELECT USING (true);

CREATE POLICY "Drivers manage own trips" ON trips
  FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY "Admin manage all trips" ON trips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.email ILIKE '%admin%')
    )
  );

-- ─── 9. BOOKINGS — RLS POLICIES ─────────────────────────────

DO $$ BEGIN
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "Users view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users create bookings" ON bookings;
DROP POLICY IF EXISTS "Drivers view trip bookings" ON bookings;

CREATE POLICY "Users view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "Users create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Users update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- ─── 10. AUTO-SYNC PROFILE ON SIGNUP ────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_verified, verification_status, rating, trips_count, avatar, bio, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger'),
    false,
    'unverified',
    5.0,
    0,
    CONCAT('https://api.dicebear.com/7.x/avataaars/svg?seed=', encode(NEW.id::text::bytea, 'base64')),
    '',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 11. AUTO-UPDATE updated_at ─────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── DONE ────────────────────────────────────────────────────
-- Run this script once in Supabase SQL Editor.
-- All buckets, RLS policies, and triggers will be set up.
