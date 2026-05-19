-- ============================================================
-- WansniAuto - Complete Supabase Schema
-- Last updated: 2026-05-17
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (User profiles linked to auth.users)
-- ============================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'::text,
  bio TEXT,
  role TEXT DEFAULT 'passenger'::text,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified'::text,
  rating NUMERIC DEFAULT 5.0,
  trips_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating') THEN
    ALTER TABLE profiles ADD COLUMN rating NUMERIC DEFAULT 5.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trips_count') THEN
    ALTER TABLE profiles ADD COLUMN trips_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Allow everyone to read profiles (needed for driver info in search)
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. TRIPS TABLE (Published rides)
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  departure_date DATE NOT NULL,
  departure_time TEXT NOT NULL,
  arrival_time TEXT,
  price NUMERIC NOT NULL,
  available_seats INTEGER NOT NULL DEFAULT 1,
  total_seats INTEGER NOT NULL DEFAULT 3,
  distance TEXT,
  duration TEXT,
  status TEXT DEFAULT 'upcoming',
  route TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{"Air Conditioning"}',
  vehicle_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_trips_from ON trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);

-- Enable RLS on trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_all" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;

CREATE POLICY "trips_select_all"
  ON trips FOR SELECT USING (true);

CREATE POLICY "trips_insert_own"
  ON trips FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "trips_update_own"
  ON trips FOR UPDATE USING (auth.uid() = driver_id);

CREATE POLICY "trips_delete_own"
  ON trips FOR DELETE USING (auth.uid() = driver_id);

-- ============================================================
-- 3. MESSAGES TABLE (Chat between users)
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast chat loading
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- Enable RLS on messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;

CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- 4. VERIFICATIONS TABLE (Driver document uploads)
-- ============================================================

CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_doc_type CHECK (doc_type IN ('cin', 'license', 'registration', 'insurance', 'selfie')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);

-- Enable RLS on verifications
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verifications_select_own" ON verifications;
DROP POLICY IF EXISTS "verifications_insert_own" ON verifications;
DROP POLICY IF EXISTS "verifications_select_admin" ON verifications;

CREATE POLICY "verifications_select_own"
  ON verifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verifications_insert_own"
  ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verifications_select_admin"
  ON verifications FOR SELECT USING (true);

-- ============================================================
-- 5. BOOKINGS TABLE (Trip bookings/reservations)
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seats INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'pending',
  total_price NUMERIC,
  passenger_name TEXT,
  passenger_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_booking_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Enable RLS on bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_participant" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON bookings;

CREATE POLICY "bookings_select_participant"
  ON bookings FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

CREATE POLICY "bookings_insert_own"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

-- ============================================================
-- 6. VEHICLE_PROFILES TABLE (Driver vehicles)
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_profiles (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_vehicle_type CHECK (type IN ('sedan', 'suv', 'van', 'hatchback'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicle_profiles(driver_id);

-- Enable RLS on vehicle_profiles
ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select_all" ON vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_update_own" ON vehicle_profiles;

CREATE POLICY "vehicles_select_all"
  ON vehicle_profiles FOR SELECT USING (true);

CREATE POLICY "vehicles_insert_own"
  ON vehicle_profiles FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "vehicles_update_own"
  ON vehicle_profiles FOR UPDATE USING (auth.uid() = driver_id);

-- ============================================================
-- 7. REVIEWS TABLE (Trip ratings and reviews)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;

CREATE POLICY "reviews_select_all"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- 8. TRIGGER: Auto-create profile on signup
-- ============================================================

-- Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_verified, verification_status, avatar)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'passenger'),
    false,
    'unverified',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. FUNCTION: Update timestamps automatically
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 10. GRANT PERMISSIONS (for REST API access)
-- ============================================================

GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trips TO anon, authenticated;
GRANT SELECT, INSERT ON messages TO anon, authenticated;
GRANT SELECT, INSERT ON verifications TO anon, authenticated;
GRANT SELECT, INSERT ON bookings TO anon, authenticated;
GRANT SELECT, INSERT ON vehicle_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;

-- ============================================================
-- DONE! All tables created with RLS policies.
-- ============================================================
