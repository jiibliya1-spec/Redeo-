-- ============================================================
-- SQL خاص بـ Supabase باش يخدم Verification Sync صحيح
-- دير Copy/Paste لهاد الكود فSupabase SQL Editor
-- ============================================================

-- 1. تأكد أن Realtime مفعل على الـ tables المهمة
BEGIN;

-- تفعيل Realtime على profiles (حيوي باش verification sync يخدم)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- تفعيل Realtime على verifications
ALTER PUBLICATION supabase_realtime ADD TABLE verifications;

-- تفعيل Realtime على trips
ALTER PUBLICATION supabase_realtime ADD TABLE trips;

-- تفعيل Realtime على bookings
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- تفعيل Realtime على messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- تفعيل Realtime على notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- تفعيل Realtime على support_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;

COMMIT;

-- ============================================================
-- 2. تأكد أن الـ profiles table كاين والأعمدة صحيحة
-- ============================================================

-- إضافة الأعمدة المفقودة على profiles (إذا مكاينينش)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS trips_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

-- تأكد أن verification_status عندو قيم مقبولة
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_verification_status_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_verification_status_check 
  CHECK (verification_status IN ('unverified', 'submitted', 'approved', 'rejected', 'pending'));

-- ============================================================
-- 3. إنشاء الـ verifications table (إذا مكاينش)
-- ============================================================

CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('cin', 'license', 'selfie', 'registration', 'insurance')),
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'pending', 'verified', 'rejected')),
  url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_type)
);

-- ============================================================
-- 4. RLS Policies (مهم بزاف!)
-- ============================================================

-- تشغيل RLS على profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- السياسة: المستخدم يقدر يشوف profile ديالو
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- السياسة: المستخدم يقدر يحدث profile ديالو
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- السياسة: Admin يقدر يشوف جميع profiles
DROP POLICY IF EXISTS profiles_admin_select ON profiles;
CREATE POLICY profiles_admin_select ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- السياسة: Admin يقدر يحدث جميع profiles
DROP POLICY IF EXISTS profiles_admin_update ON profiles;
CREATE POLICY profiles_admin_update ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- تشغيل RLS على verifications
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- السياسة: السائق يقدر يشوف verification ديالو
DROP POLICY IF EXISTS verifications_select_own ON verifications;
CREATE POLICY verifications_select_own ON verifications
  FOR SELECT USING (auth.uid() = user_id);

-- السياسة: السائق يقدر يضيف/يحدث verification ديالو
DROP POLICY IF EXISTS verifications_insert_own ON verifications;
CREATE POLICY verifications_insert_own ON verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS verifications_update_own ON verifications;
CREATE POLICY verifications_update_own ON verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- السياسة: Admin يقدر يشوف جميع verifications
DROP POLICY IF EXISTS verifications_admin_select ON verifications;
CREATE POLICY verifications_admin_select ON verifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- السياسة: Admin يقدر يحدث جميع verifications
DROP POLICY IF EXISTS verifications_admin_update ON verifications;
CREATE POLICY verifications_admin_update ON verifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. Function: auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger على profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger على verifications
DROP TRIGGER IF EXISTS update_verifications_updated_at ON verifications;
CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Notifications table (إذا مكاينش)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_admin ON notifications;
CREATE POLICY notifications_insert_admin ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 7. Messages table (إذا مكاينش)
-- ============================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select_participant ON messages;
CREATE POLICY messages_select_participant ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS messages_insert_own ON messages;
CREATE POLICY messages_insert_own ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS messages_update_participant ON messages;
CREATE POLICY messages_update_participant ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
