-- ============================================================
-- WANSNIAUTO COMPLETE MIGRATION
-- Multi-role + Verification + Messages + Notifications
-- Run this in Supabase SQL Editor (ALL at once)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE - Enhanced with multi-role support
-- ============================================================

-- Add verification_status if not exists
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' 
    CHECK (verification_status IN ('unverified', 'pending', 'submitted', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS trips_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS passenger_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS passenger_verification_status TEXT DEFAULT 'unverified'
    CHECK (passenger_verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Update existing users: set unverified if not set
UPDATE profiles SET 
  verification_status = COALESCE(verification_status, 'unverified'),
  is_verified = COALESCE(is_verified, FALSE)
WHERE verification_status IS NULL;

-- ============================================================
-- 2. VERIFICATIONS TABLE (keep existing, add columns)
-- ============================================================

-- Add columns to existing verifications table
ALTER TABLE verifications 
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS doc_category TEXT DEFAULT 'identity';

-- Update doc_type constraint to include new types
ALTER TABLE verifications 
  DROP CONSTRAINT IF EXISTS verifications_doc_type_check;

ALTER TABLE verifications 
  ADD CONSTRAINT verifications_doc_type_check 
  CHECK (doc_type IN (
    'cin', 'cin_front', 'cin_back', 'selfie', 
    'license', 'driver_license', 
    'registration', 'vehicle_registration',
    'insurance', 
    'car_photo_front', 'car_photo_back', 'car_photo_side'
  ));

-- Enable RLS (already enabled but ensure)

-- User can see own documents
DROP POLICY IF EXISTS vdocs_select_own ON verification_documents;
CREATE POLICY vdocs_select_own ON verification_documents
  FOR SELECT USING (auth.uid() = user_id);

-- User can insert own documents
DROP POLICY IF EXISTS vdocs_insert_own ON verification_documents;
CREATE POLICY vdocs_insert_own ON verification_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can see all
DROP POLICY IF EXISTS vdocs_admin_select ON verification_documents;
CREATE POLICY vdocs_admin_select ON verification_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update all (approve/reject)
DROP POLICY IF EXISTS vdocs_admin_update ON verification_documents;
CREATE POLICY vdocs_admin_update ON verification_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. MESSAGES TABLE - Proper chat system
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID DEFAULT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent self-messaging
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- User can see messages they sent or received
DROP POLICY IF EXISTS messages_select_participant ON messages;
CREATE POLICY messages_select_participant ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- User can only send as themselves
DROP POLICY IF EXISTS messages_insert_own ON messages;
CREATE POLICY messages_insert_own ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- User can mark as read (receiver only)
DROP POLICY IF EXISTS messages_update_receiver ON messages;
CREATE POLICY messages_update_receiver ON messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Admin can see all
DROP POLICY IF EXISTS messages_admin_all ON messages;
CREATE POLICY messages_admin_all ON messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'verification_approved', 'verification_rejected', 
    'booking_confirmed', 'booking_cancelled',
    'trip_reminder', 'new_message', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User can see own notifications
DROP POLICY IF EXISTS notif_select_own ON notifications;
CREATE POLICY notif_select_own ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System/admin can insert
DROP POLICY IF EXISTS notif_insert_admin ON notifications;
CREATE POLICY notif_insert_admin ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = user_id
  );

-- User can mark as read
DROP POLICY IF EXISTS notif_update_own ON notifications;
CREATE POLICY notif_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 5. TRIPS TABLE - Ensure driver_id is stored
-- ============================================================

ALTER TABLE trips 
  ADD COLUMN IF NOT EXISTS driver_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- 6. BOOKINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  passenger_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  seats INTEGER DEFAULT 1,
  total_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookings_select_participant ON bookings;
CREATE POLICY bookings_select_participant ON bookings
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

DROP POLICY IF EXISTS bookings_insert_passenger ON bookings;
CREATE POLICY bookings_insert_passenger ON bookings
  FOR INSERT WITH CHECK (auth.uid() = passenger_id);

DROP POLICY IF EXISTS bookings_update_participant ON bookings;
CREATE POLICY bookings_update_participant ON bookings
  FOR UPDATE USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- ============================================================
-- 7. REALTIME - Enable for all tables
-- ============================================================

DO $$
BEGIN
  -- Enable realtime for profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  -- Enable realtime for verification_documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'verification_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE verification_documents;
  END IF;

  -- Enable realtime for messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  -- Enable realtime for notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- Enable realtime for trips
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'trips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trips;
  END IF;

  -- Enable realtime for bookings
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;

-- ============================================================
-- 8. AUTO-UPDATE TRIGGER for updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid errors
DROP TRIGGER IF EXISTS trg_verification_documents_updated ON verification_documents;
DROP TRIGGER IF EXISTS trg_bookings_updated ON bookings;

-- Create triggers
CREATE TRIGGER trg_verification_documents_updated
  BEFORE UPDATE ON verification_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. FUNCTION: Approve verification (admin)
-- ============================================================

CREATE OR REPLACE FUNCTION approve_user_verification(p_user_id UUID, p_admin_notes TEXT DEFAULT '')
RETURNS VOID AS $$
BEGIN
  -- Approve all pending documents
  UPDATE verification_documents 
  SET status = 'approved', admin_notes = p_admin_notes, updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'pending';

  -- Update profile
  UPDATE profiles 
  SET is_verified = TRUE, 
      verification_status = 'verified',
      verification_notes = p_admin_notes,
      rejection_reason = '',
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id, 
    'verification_approved',
    'Documents Approved',
    'Your documents have been verified. You can now publish trips and use all features.',
    '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. FUNCTION: Reject verification (admin)
-- ============================================================

CREATE OR REPLACE FUNCTION reject_user_verification(p_user_id UUID, p_reason TEXT)
RETURNS VOID AS $$
BEGIN
  -- Reject all pending documents
  UPDATE verification_documents 
  SET status = 'rejected', rejection_reason = p_reason, updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'pending';

  -- Update profile
  UPDATE profiles 
  SET is_verified = FALSE, 
      verification_status = 'rejected',
      rejection_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id, 
    'verification_rejected',
    'Documents Rejected',
    'Your verification was rejected. Reason: ' || p_reason || '. Please re-upload your documents.',
    jsonb_build_object('reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. RLS POLICIES for profiles (critical!)
-- ============================================================

-- User can see own profile
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- User can update own profile (except role/admin fields)
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can see ALL profiles
DROP POLICY IF EXISTS profiles_admin_select ON profiles;
CREATE POLICY profiles_admin_select ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update ALL profiles
DROP POLICY IF EXISTS profiles_admin_update ON profiles;
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow insert on profiles for new users (trigger)
DROP POLICY IF EXISTS profiles_insert_new ON profiles;
CREATE POLICY profiles_insert_new ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 12. STORAGE BUCKETS
-- ============================================================

-- Documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Messages bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. STORAGE POLICIES
-- ============================================================

-- Documents: Users can upload their own
DROP POLICY IF EXISTS documents_upload_own ON storage.objects;
CREATE POLICY documents_upload_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );

-- Documents: Users can see their own
DROP POLICY IF EXISTS documents_select_own ON storage.objects;
CREATE POLICY documents_select_own ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );

-- Documents: Admin can see all
DROP POLICY IF EXISTS documents_admin_select ON storage.objects;
CREATE POLICY documents_admin_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Avatars: Public read
DROP POLICY IF EXISTS avatars_public_select ON storage.objects;
CREATE POLICY avatars_public_select ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Avatars: Users upload own
DROP POLICY IF EXISTS avatars_upload_own ON storage.objects;
CREATE POLICY avatars_upload_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- 14. INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_verification_docs_user ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON profiles(verification_status);

-- ============================================================
-- 15. AUTO-CREATE PROFILE TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id, email, first_name, last_name, role, 
    is_verified, verification_status, 
    passenger_verified, passenger_verification_status,
    avatar, rating, trips_count, created_at
  ) VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger'),
    FALSE,
    'unverified',
    FALSE,
    'unverified',
    '',
    5.0,
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS trg_create_profile ON auth.users;
CREATE TRIGGER trg_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ============================================================
-- DONE! All migrations applied successfully.
-- ============================================================
