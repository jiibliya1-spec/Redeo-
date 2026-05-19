-- Run this in SUPABASE (not GitHub!) → SQL Editor → New Query
-- supabase.com → Your Project → SQL Editor

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. TRIPS TABLE
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
  available_seats INTEGER DEFAULT 3,
  total_seats INTEGER DEFAULT 3,
  distance TEXT,
  duration TEXT,
  status TEXT DEFAULT 'upcoming',
  route TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{Air Conditioning}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. BOOKINGS TABLE
-- ============================================================
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

-- ============================================================
-- 5. VERIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. REVIEWS TABLE
-- ============================================================
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
-- 7. SUPPORT TICKETS TABLE
-- ============================================================
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
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP OLD POLICIES (if any exist)
-- ============================================================
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "bookings_select" ON bookings;
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_update" ON bookings;
DROP POLICY IF EXISTS "trips_select" ON trips;
DROP POLICY IF EXISTS "trips_insert" ON trips;
DROP POLICY IF EXISTS "trips_update" ON trips;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "verifications_select" ON verifications;
DROP POLICY IF EXISTS "verifications_insert" ON verifications;
DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
DROP POLICY IF EXISTS "support_select" ON support_tickets;
DROP POLICY IF EXISTS "support_insert" ON support_tickets;
DROP POLICY IF EXISTS "support_update" ON support_tickets;

-- ============================================================
-- CREATE NEW OPEN POLICIES
-- ============================================================

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- TRIPS
CREATE POLICY "trips_select" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "trips_update" ON trips FOR UPDATE USING (auth.uid() = driver_id);

-- MESSAGES (OPEN for chat)
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (true);

-- BOOKINGS (OPEN)
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (true);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (true);

-- VERIFICATIONS
CREATE POLICY "verifications_select" ON verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REVIEWS
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- SUPPORT TICKETS
CREATE POLICY "support_select" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "support_insert" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_update" ON support_tickets FOR UPDATE USING (true);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trips TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO anon, authenticated;
GRANT SELECT, INSERT ON verifications TO anon, authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO anon, authenticated;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
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

-- DONE!
