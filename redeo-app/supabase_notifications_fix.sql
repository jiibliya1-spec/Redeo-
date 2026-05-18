-- ============================================================
-- NOTIFICATIONS SYSTEM FIX
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure notifications table exists
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

-- 2. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS notif_select_own ON notifications;
DROP POLICY IF EXISTS notif_insert_admin ON notifications;
DROP POLICY IF EXISTS notif_insert_own ON notifications;
DROP POLICY IF EXISTS notif_update_own ON notifications;

-- User sees own notifications
CREATE POLICY notif_select_own ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can insert notifications for any user
CREATE POLICY notif_insert_admin ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() = user_id
  );

-- User can mark own notifications as read
CREATE POLICY notif_update_own ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Enable Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- 4. Enable Realtime for verifications (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'verifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE verifications;
  END IF;
END $$;

-- 5. Ensure documents storage bucket is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage policies for documents
DROP POLICY IF EXISTS documents_insert_own ON storage.objects;
DROP POLICY IF EXISTS documents_select_own ON storage.objects;

CREATE POLICY documents_insert_own ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY documents_select_own ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY documents_select_admin ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);

-- 8. Function: Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND read = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;

SELECT 'Notifications system fixed successfully!' AS result;
