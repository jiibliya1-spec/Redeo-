-- ============================================================
-- WansniAuto - Fix for Supabase (Conflict-free version)
-- Run this AFTER the main schema (or standalone to fix errors)
-- ============================================================

-- ============================================================
-- STEP 1: Temporarily disable RLS to fix conflicts
-- ============================================================

DO $$ 
BEGIN
  -- Disable RLS first
  ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS trips DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS verifications DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS bookings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS vehicle_profiles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS reviews DISABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some tables may not exist yet: %', SQLERRM;
END $$;

-- ============================================================
-- STEP 2: Drop ALL conflicting policies
-- ============================================================

DO $$
DECLARE
  pol RECORD;
  tbl RECORD;
  tables TEXT[] := ARRAY['profiles', 'trips', 'messages', 'verifications', 'bookings', 'vehicle_profiles', 'reviews'];
BEGIN
  FOREACH tbl_name IN ARRAY tables
  LOOP
    FOR pol IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = tbl_name AND schemaname = 'public'
    LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl_name);
        RAISE NOTICE 'Dropped policy % on %', pol.policyname, tbl_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop policy %: %', pol.policyname, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Drop triggers/functions if they exist
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- STEP 4: Create tables (IF NOT EXISTS - safe to re-run)
-- ============================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  bio TEXT,
  role TEXT DEFAULT 'passenger',
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified',
  rating NUMERIC DEFAULT 5.0,
  trips_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trips_count INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
END $$;

-- 2. TRIPS
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
  amenities TEXT[] DEFAULT '{Air Conditioning}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VERIFICATIONS
CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BOOKINGS
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. VEHICLE_PROFILES
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 5: Create Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trips_from ON trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicle_profiles(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ============================================================
-- STEP 6: Re-enable RLS and create policies (AFTER dropping old ones)
-- ============================================================

-- PROFILES: Allow everyone to SELECT (needed for driver info), own write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- TRIPS: Allow everyone to SELECT, own write
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_select"
  ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert"
  ON trips FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "trips_update"
  ON trips FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "trips_delete"
  ON trips FOR DELETE USING (auth.uid() = driver_id);

-- MESSAGES: Only participants
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select"
  ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert"
  ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- VERIFICATIONS: Own + admin (open SELECT)
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_select"
  ON verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verifications_insert"
  ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BOOKINGS: Participants
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select"
  ON bookings FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
CREATE POLICY "bookings_insert"
  ON bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

-- VEHICLE_PROFILES: All SELECT, own write
ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_select"
  ON vehicle_profiles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert"
  ON vehicle_profiles FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "vehicles_update"
  ON vehicle_profiles FOR UPDATE USING (auth.uid() = driver_id);

-- REVIEWS: All SELECT, own write
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- STEP 7: Create auto-profile trigger (safe version)
-- ============================================================

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

-- Create trigger (only if we have access)
DO $$
BEGIN
  EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()';
  RAISE NOTICE 'Trigger created successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create trigger (may need elevated permissions): %', SQLERRM;
END $$;

-- ============================================================
-- STEP 8: Grant permissions
-- ============================================================

GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trips TO anon, authenticated;
GRANT SELECT, INSERT ON messages TO anon, authenticated;
GRANT SELECT, INSERT ON verifications TO anon, authenticated;
GRANT SELECT, INSERT ON bookings TO anon, authenticated;
GRANT SELECT, INSERT ON vehicle_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;

-- ============================================================
-- DONE! Run this first, then the data fix script below if needed.
-- ============================================================
