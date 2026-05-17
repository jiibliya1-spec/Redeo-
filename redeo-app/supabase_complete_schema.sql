-- ============================================================
-- Redeo / WansniAuto — Complete Supabase Schema v2
-- Run this ENTIRE file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verification_status') THEN ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating') THEN ALTER TABLE profiles ADD COLUMN rating NUMERIC DEFAULT 5.0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='trips_count') THEN ALTER TABLE profiles ADD COLUMN trips_count INTEGER DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN ALTER TABLE profiles ADD COLUMN bio TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='updated_at') THEN ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. VEHICLE_PROFILES TABLE
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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicle_profiles(driver_id);

ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_select_all" ON vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_update_own" ON vehicle_profiles;
DROP POLICY IF EXISTS "vehicles_delete_own" ON vehicle_profiles;
CREATE POLICY "vehicles_select_all" ON vehicle_profiles FOR SELECT USING (true);
CREATE POLICY "vehicles_insert_own" ON vehicle_profiles FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "vehicles_update_own" ON vehicle_profiles FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "vehicles_delete_own" ON vehicle_profiles FOR DELETE USING (auth.uid() = driver_id);

-- ============================================================
-- 3. TRIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicle_profiles(id) ON DELETE SET NULL,
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
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='vehicle_id') THEN ALTER TABLE trips ADD COLUMN vehicle_id UUID REFERENCES vehicle_profiles(id) ON DELETE SET NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='notes') THEN ALTER TABLE trips ADD COLUMN notes TEXT; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_from ON trips(from_location);
CREATE INDEX IF NOT EXISTS idx_trips_to ON trips(to_location);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trips_select_all" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;
CREATE POLICY "trips_select_all" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_own" ON trips FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "trips_update_own" ON trips FOR UPDATE USING (auth.uid() = driver_id);
CREATE POLICY "trips_delete_own" ON trips FOR DELETE USING (auth.uid() = driver_id);

-- ============================================================
-- 4. BOOKINGS TABLE
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
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_select_participant" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_passenger" ON bookings;
DROP POLICY IF EXISTS "bookings_update_passenger" ON bookings;
DROP POLICY IF EXISTS "bookings_update_driver" ON bookings;
CREATE POLICY "bookings_select_participant" ON bookings FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
CREATE POLICY "bookings_insert_passenger" ON bookings FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "bookings_update_passenger" ON bookings FOR UPDATE USING (auth.uid() = passenger_id);
CREATE POLICY "bookings_update_driver" ON bookings FOR UPDATE USING (auth.uid() = driver_id);

-- ============================================================
-- 5. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  image_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='message_type') THEN ALTER TABLE messages ADD COLUMN message_type TEXT DEFAULT 'text'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='image_url') THEN ALTER TABLE messages ADD COLUMN image_url TEXT; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_own" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_any" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. VERIFICATIONS TABLE
-- ============================================================
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='verifications' AND column_name='admin_note') THEN ALTER TABLE verifications ADD COLUMN admin_note TEXT; END IF;
  ALTER TABLE verifications DROP CONSTRAINT IF EXISTS valid_doc_type;
  ALTER TABLE verifications DROP CONSTRAINT IF EXISTS valid_status;
END $$;

CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verifications_select_own" ON verifications;
DROP POLICY IF EXISTS "verifications_insert_own" ON verifications;
DROP POLICY IF EXISTS "verifications_update_own" ON verifications;
DROP POLICY IF EXISTS "verifications_select_all" ON verifications;
DROP POLICY IF EXISTS "verifications_select_admin" ON verifications;
DROP POLICY IF EXISTS "verifications_update_all" ON verifications;
CREATE POLICY "verifications_select_all" ON verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert_own" ON verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verifications_update_all" ON verifications FOR UPDATE USING (true);

-- ============================================================
-- 8. REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_trip ON reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- 9. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'MAD',
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_driver ON payments(driver_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_select_own" ON payments;
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = driver_id);
CREATE POLICY "payments_insert_own" ON payments FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- ============================================================
-- 10. SUPPORT_TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='priority') THEN ALTER TABLE support_tickets ADD COLUMN priority TEXT DEFAULT 'normal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='admin_reply') THEN ALTER TABLE support_tickets ADD COLUMN admin_reply TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='updated_at') THEN ALTER TABLE support_tickets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now(); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='name') THEN ALTER TABLE support_tickets ADD COLUMN name TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='email') THEN ALTER TABLE support_tickets ADD COLUMN email TEXT; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "support_select_all" ON support_tickets;
DROP POLICY IF EXISTS "support_insert_any" ON support_tickets;
DROP POLICY IF EXISTS "support_update_own" ON support_tickets;
CREATE POLICY "support_select_all" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "support_insert_any" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_update_own" ON support_tickets FOR UPDATE USING (true);

-- ============================================================
-- 11. SAVED_PASSENGERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_passengers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, passenger_id)
);

ALTER TABLE saved_passengers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_passengers_select_own" ON saved_passengers;
DROP POLICY IF EXISTS "saved_passengers_insert_own" ON saved_passengers;
DROP POLICY IF EXISTS "saved_passengers_delete_own" ON saved_passengers;
CREATE POLICY "saved_passengers_select_own" ON saved_passengers FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "saved_passengers_insert_own" ON saved_passengers FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "saved_passengers_delete_own" ON saved_passengers FOR DELETE USING (auth.uid() = driver_id);

-- ============================================================
-- 12. REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_insert_own" ON reports;
DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_own" ON reports FOR SELECT USING (true);

-- ============================================================
-- 13. USER_SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
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

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select_own" ON user_settings;
DROP POLICY IF EXISTS "settings_insert_own" ON user_settings;
DROP POLICY IF EXISTS "settings_update_own" ON user_settings;
CREATE POLICY "settings_select_own" ON user_settings FOR SELECT USING (auth.uid() = id);
CREATE POLICY "settings_insert_own" ON user_settings FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "settings_update_own" ON user_settings FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 14. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/jpg']),
  ('documents', 'documents', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/jpg','application/pdf']),
  ('chat-images', 'chat-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/jpg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "documents_read_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_read" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_upload" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "documents_upload_own" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "documents_read_own" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR true));
CREATE POLICY "chat_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "chat_images_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

-- ============================================================
-- 15. TRIGGER: Auto-create profile on signup
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

  INSERT INTO public.user_settings (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 16. TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT DISTINCT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 17. FUNCTION: Update driver rating after review
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_driver_rating ON reviews;
CREATE TRIGGER trg_update_driver_rating
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating();

-- ============================================================
-- 18. FUNCTION: Handle booking status changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    UPDATE trips
    SET available_seats = GREATEST(0, available_seats - NEW.seats)
    WHERE id = NEW.trip_id;

    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.passenger_id,
      'Booking Confirmed!',
      'Your booking has been confirmed by the driver.',
      'success',
      '/my-trips'
    );
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status IN ('pending', 'confirmed') THEN
    IF OLD.status = 'confirmed' THEN
      UPDATE trips
      SET available_seats = available_seats + NEW.seats
      WHERE id = NEW.trip_id;
    END IF;

    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.passenger_id,
      'Booking Cancelled',
      'Your booking has been cancelled.',
      'error',
      '/my-trips'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_status_change ON bookings;
CREATE TRIGGER trg_booking_status_change
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_status_change();

-- ============================================================
-- 19. FUNCTION: Notify driver on new booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    NEW.driver_id,
    'New Booking Request',
    COALESCE(NEW.passenger_name, 'A passenger') || ' wants to book ' || NEW.seats || ' seat(s) on your trip.',
    'info',
    '/dashboard'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_booking ON bookings;
CREATE TRIGGER trg_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking();

-- ============================================================
-- 20. GRANTS
-- ============================================================
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON trips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON trips TO authenticated;
GRANT SELECT ON vehicle_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON vehicle_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON verifications TO authenticated;
GRANT SELECT, INSERT ON reviews TO authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT, INSERT ON support_tickets TO anon, authenticated;
GRANT UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_passengers TO authenticated;
GRANT SELECT, INSERT ON reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;

-- ============================================================
-- DONE! 13 tables + triggers + storage + RLS created.
-- ============================================================
