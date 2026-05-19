-- ============================================================
-- WansniAuto - FIX: Create tables FIRST, then policies
-- Run this in Supabase SQL Editor (one query at a time if needed)
-- ============================================================

-- ============================================================
-- PART 1: CREATE ALL TABLES FIRST
-- ============================================================

-- 1. PROFILES (must exist first)
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
  available_seats INTEGER DEFAULT 3,
  total_seats INTEGER DEFAULT 3,
  distance TEXT,
  duration TEXT,
  status TEXT DEFAULT 'upcoming',
  route TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{Air Conditioning}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. MESSAGES (OPEN for real-time chat)
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seats INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  total_price NUMERIC,
  passenger_name TEXT,
  passenger_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. VEHICLE PROFILES
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

-- 8. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  screenshot_url TEXT,
  admin_reply TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 2: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================================

DO $$
DECLARE pol RECORD; tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','trips','messages','verifications','bookings','vehicle_profiles','reviews','support_tickets']
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      BEGIN EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl); EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- PART 4: CREATE POLICIES (tables now exist)
-- ============================================================

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- TRIPS
CREATE POLICY "trips_select" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (auth.uid() = driver_id);

-- MESSAGES (OPEN for real-time chat between users)
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (true);

-- VERIFICATIONS
CREATE POLICY "verifications_select" ON verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- BOOKINGS
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);

-- VEHICLE PROFILES
CREATE POLICY "vehicles_select" ON vehicle_profiles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert" ON vehicle_profiles FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- REVIEWS
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- SUPPORT TICKETS
CREATE POLICY "support_select" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "support_insert" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_update" ON support_tickets FOR UPDATE USING (true);

-- ============================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trips TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO anon, authenticated;
GRANT SELECT, INSERT ON verifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO anon, authenticated;
GRANT SELECT, INSERT ON vehicle_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO anon, authenticated;

-- ============================================================
-- PART 6: AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, is_verified, verification_status, avatar)
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

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- DONE! All tables created with policies.
-- ============================================================
