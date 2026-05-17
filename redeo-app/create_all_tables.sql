-- ═══════════════════════════════════════════════════
-- WansniAuto - Create ALL missing tables
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 1. TRIPS TABLE (was missing!)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location text NOT NULL,
  to_location text NOT NULL,
  departure_date date NOT NULL,
  departure_time text NOT NULL,
  arrival_time text,
  price numeric NOT NULL DEFAULT 0,
  available_seats integer NOT NULL DEFAULT 1,
  total_seats integer NOT NULL DEFAULT 4,
  distance text,
  duration text,
  status text DEFAULT 'upcoming',
  route jsonb DEFAULT '[]'::jsonb,
  amenities jsonb DEFAULT '["Air Conditioning"]'::jsonb,
  vehicle_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_all" ON public.trips;
CREATE POLICY "trips_select_all" ON public.trips
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
CREATE POLICY "trips_insert_own" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
CREATE POLICY "trips_update_own" ON public.trips
  FOR UPDATE TO authenticated USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
CREATE POLICY "trips_delete_own" ON public.trips
  FOR DELETE TO authenticated USING (auth.uid() = driver_id);

-- ═══════════════════════════════════════════════
-- 2. PROFILES - Add missing columns
-- ═══════════════════════════════════════════════
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

UPDATE public.profiles 
SET verification_status = 'unverified' 
WHERE verification_status IS NULL;

UPDATE public.profiles 
SET is_verified = false 
WHERE is_verified IS NULL;

-- Fix RLS for profiles (admin can view/update all)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════
-- 3. VERIFICATIONS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('cin', 'selfie', 'license', 'registration', 'insurance')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  url text NOT NULL,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, doc_type)
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verif_select" ON public.verifications;
CREATE POLICY "verif_select" ON public.verifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "verif_insert" ON public.verifications;
CREATE POLICY "verif_insert" ON public.verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "verif_update" ON public.verifications;
CREATE POLICY "verif_update" ON public.verifications
  FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════
-- 4. MESSAGES TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ═══════════════════════════════════════════════
-- 5. BOOKINGS TABLE
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL,
  passenger_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  seats integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
CREATE POLICY "bookings_select" ON public.bookings
  FOR SELECT TO authenticated USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- ═══════════════════════════════════════════════
-- 6. REALTIME
-- ═══════════════════════════════════════════════
ALTER TABLE public.messages REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- ═══════════════════════════════════════════════
-- 7. AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, is_verified, verification_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'passenger'),
    false,
    'unverified'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════
-- Verify all tables exist
-- ═══════════════════════════════════════════════
SELECT 
  table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') as trips_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') as profiles_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verifications') as verifications_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') as messages_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') as bookings_exists;
