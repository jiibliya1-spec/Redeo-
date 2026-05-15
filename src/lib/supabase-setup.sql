-- ============================================================
-- WansniAuto - PRODUCTION Supabase Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rating FLOAT NOT NULL DEFAULT 5.0,
  trips_count INT NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read all profiles, update only their own
CREATE POLICY "Profiles read all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles update own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles insert own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, avatar, is_verified, rating, trips_count)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || COALESCE(NEW.email, 'user')),
    false,
    5.0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INT NOT NULL DEFAULT 2024,
  color TEXT NOT NULL DEFAULT '',
  plate_number TEXT NOT NULL DEFAULT '',
  seats INT NOT NULL DEFAULT 4,
  image TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'sedan' CHECK (type IN ('sedan', 'suv', 'van')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicles all" ON vehicles FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  from_location TEXT NOT NULL DEFAULT '',
  to_location TEXT NOT NULL DEFAULT '',
  departure_date TEXT NOT NULL DEFAULT '',
  departure_time TEXT NOT NULL DEFAULT '',
  arrival_time TEXT NOT NULL DEFAULT '',
  price INT NOT NULL DEFAULT 0,
  available_seats INT NOT NULL DEFAULT 0,
  total_seats INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
  route TEXT[] NOT NULL DEFAULT '{}',
  distance TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trips all" ON trips FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trips_from ON trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- ============================================================
-- 4. BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seats INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_price INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings all" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages all" ON messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews all" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'cin' CHECK (doc_type IN ('cin', 'license', 'selfie', 'registration', 'insurance')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verifications all" ON verifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DEMO DATA
-- ============================================================

INSERT INTO profiles (id, name, email, phone, role, is_verified, rating, trips_count, avatar, bio) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Youssef Alami', 'youssef@demo.ma', '+212612345678', 'driver', true, 4.8, 127, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef', 'Experienced driver, safe and punctual.'),
  ('00000000-0000-0000-0000-000000000002', 'Sara Benkirane', 'sara@demo.ma', '+212623456789', 'driver', true, 4.9, 89, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara', 'Friendly and reliable.'),
  ('00000000-0000-0000-0000-000000000003', 'Omar Idrissi', 'omar@demo.ma', '+212634567890', 'driver', true, 4.7, 203, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar', 'Business traveler with comfortable sedan.'),
  ('00000000-0000-0000-0000-000000000004', 'Layla Moussaoui', 'layla@demo.ma', '+212645678901', 'passenger', true, 4.9, 34, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Layla', 'Regular commuter.'),
  ('00000000-0000-0000-0000-000000000005', 'Karim Tahiri', 'karim@demo.ma', '+212656789012', 'passenger', false, 5.0, 12, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim', 'Love meeting new people.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (driver_id, make, model, year, color, plate_number, seats, image, type) VALUES
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'Mercedes-Benz', 'C-Class', 2023, 'Dark Gray', '12345-A-6', 4, '/images/car-1.jpg', 'sedan'),
  ((SELECT id FROM profiles WHERE email='sara@demo.ma'), 'BMW', 'X5', 2022, 'White', '67890-B-7', 6, '/images/car-2.jpg', 'suv'),
  ((SELECT id FROM profiles WHERE email='omar@demo.ma'), 'Volkswagen', 'Passat', 2023, 'Black', '11111-C-8', 4, '/images/car-1.jpg', 'sedan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (driver_id, from_location, to_location, departure_date, departure_time, arrival_time, price, available_seats, total_seats, status, route, distance, duration, amenities) VALUES
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'Casablanca', 'Marrakech', '2025-07-20', '08:00', '10:30', 120, 3, 4, 'upcoming', ARRAY['Casablanca','Settat','Berrechid','Marrakech'], '240 km', '2h 30min', ARRAY['Air Conditioning','USB Charging','Music']),
  ((SELECT id FROM profiles WHERE email='sara@demo.ma'), 'Tanger', 'Rabat', '2025-07-20', '09:30', '12:00', 95, 4, 6, 'upcoming', ARRAY['Tanger','Asilah','Larache','Rabat'], '250 km', '2h 30min', ARRAY['Air Conditioning','WiFi','USB Charging','Luggage Space']),
  ((SELECT id FROM profiles WHERE email='omar@demo.ma'), 'Fes', 'Casablanca', '2025-07-21', '07:00', '10:45', 110, 2, 4, 'upcoming', ARRAY['Fes','Meknes','Kenitra','Casablanca'], '290 km', '3h 45min', ARRAY['Air Conditioning','WiFi','Music']),
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'Rabat', 'Agadir', '2025-07-22', '06:00', '11:30', 180, 3, 4, 'upcoming', ARRAY['Rabat','Casablanca','El Jadida','Safi','Agadir'], '520 km', '5h 30min', ARRAY['Air Conditioning','USB Charging','Music','Luggage Space']),
  ((SELECT id FROM profiles WHERE email='sara@demo.ma'), 'Marrakech', 'Tanger', '2025-07-23', '05:30', '13:00', 220, 5, 6, 'upcoming', ARRAY['Marrakech','Casablanca','Rabat','Tanger'], '580 km', '7h 30min', ARRAY['Air Conditioning','WiFi','USB Charging','Luggage Space','Child Seat']),
  ((SELECT id FROM profiles WHERE email='omar@demo.ma'), 'Oujda', 'Fes', '2025-07-20', '10:00', '14:30', 140, 3, 4, 'upcoming', ARRAY['Oujda','Taza','Fes'], '310 km', '4h 30min', ARRAY['Air Conditioning','Music'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO bookings (trip_id, passenger_id, seats, status, total_price) VALUES
  ((SELECT id FROM trips WHERE from_location='Casablanca' LIMIT 1), (SELECT id FROM profiles WHERE email='layla@demo.ma'), 1, 'confirmed', 120),
  ((SELECT id FROM trips WHERE from_location='Tanger' LIMIT 1), (SELECT id FROM profiles WHERE email='karim@demo.ma'), 2, 'pending', 190)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (user_id, title, message, type, read) VALUES
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'New Booking Request', 'Layla wants to book 1 seat on your Casablanca to Marrakech trip', 'info', false),
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'Trip Reminder', 'Your trip to Marrakech departs tomorrow at 08:00', 'warning', false),
  ((SELECT id FROM profiles WHERE email='youssef@demo.ma'), 'Payment Received', 'You received 120 MAD for booking', 'success', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (trip_id, reviewer_id, reviewee_id, rating, comment) VALUES
  ((SELECT id FROM trips WHERE from_location='Casablanca' LIMIT 1), (SELECT id FROM profiles WHERE email='layla@demo.ma'), (SELECT id FROM profiles WHERE email='youssef@demo.ma'), 5, 'Excellent driver! Very punctual and the car was super clean.'),
  ((SELECT id FROM trips WHERE from_location='Tanger' LIMIT 1), (SELECT id FROM profiles WHERE email='layla@demo.ma'), (SELECT id FROM profiles WHERE email='sara@demo.ma'), 5, 'Sara is amazing! Felt very safe.')
ON CONFLICT (id) DO NOTHING;
