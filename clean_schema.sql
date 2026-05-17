-- ============================================================
-- WansniAuto - CLEAN SETUP (Run this in a FRESH query)
-- This handles conflicts automatically
-- ============================================================

-- STEP 1: Clean up everything first (safe drop)
DO $$
DECLARE
  pol RECORD;
  tbls TEXT[] := ARRAY['profiles','trips','messages','verifications','bookings','vehicle_profiles','reviews'];
  t TEXT;
BEGIN
  -- Drop all policies on all tables
  FOREACH t IN ARRAY tbls LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public'
    LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, t);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Drop trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================
-- STEP 2: Create tables
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, email TEXT, phone TEXT,
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  bio TEXT, role TEXT DEFAULT 'passenger',
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified',
  rating NUMERIC DEFAULT 5.0, trips_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL, to_location TEXT NOT NULL,
  departure_date DATE NOT NULL, departure_time TEXT NOT NULL,
  arrival_time TEXT, price NUMERIC NOT NULL,
  available_seats INTEGER DEFAULT 1, total_seats INTEGER DEFAULT 3,
  distance TEXT, duration TEXT, status TEXT DEFAULT 'upcoming',
  route TEXT[] DEFAULT '{}', amenities TEXT[] DEFAULT '{Air Conditioning}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL, read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, status TEXT DEFAULT 'pending',
  url TEXT, admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seats INTEGER DEFAULT 1, status TEXT DEFAULT 'pending',
  total_price NUMERIC, passenger_name TEXT, passenger_phone TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL, model TEXT NOT NULL,
  year INTEGER, color TEXT, plate_number TEXT,
  seats INTEGER DEFAULT 4, image TEXT,
  type TEXT DEFAULT 'sedan', is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL, comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 3: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trips_from ON trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);

-- ============================================================
-- STEP 4: RLS + Policies (one per action)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_r" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_w" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips_r" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_w" ON trips FOR ALL USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msgs_r" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "msgs_w" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verif_r" ON verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verif_w" ON verifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_r" ON bookings FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
CREATE POLICY "book_w" ON bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);

ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "veh_r" ON vehicle_profiles FOR SELECT USING (true);
CREATE POLICY "veh_w" ON vehicle_profiles FOR ALL USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rev_r" ON reviews FOR SELECT USING (true);
CREATE POLICY "rev_w" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- STEP 5: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, is_verified, verification_status, avatar)
  VALUES (
    new.id, new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'passenger'),
    false, 'unverified',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- STEP 6: Permissions
-- ============================================================

GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON trips TO anon, authenticated;
GRANT SELECT, INSERT ON messages TO anon, authenticated;
GRANT SELECT, INSERT ON verifications TO anon, authenticated;
GRANT SELECT, INSERT ON bookings TO anon, authenticated;
GRANT SELECT, INSERT ON vehicle_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON reviews TO anon, authenticated;

-- DONE!
