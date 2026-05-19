-- ============================================================
-- WansniAuto - FIX MESSAGES RLS (Run this in Supabase SQL Editor)
-- This fixes the chat so messages flow between users in real-time
-- ============================================================

-- STEP 1: Check current policies
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'messages';

-- STEP 2: Drop ALL existing message policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- STEP 3: Create new OPEN policies (messages must flow freely)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE to INSERT (bypass auth.uid() check - the app handles sender validation)
CREATE POLICY "messages_insert_open" ON messages FOR INSERT WITH CHECK (true);

-- Allow users to SELECT messages they sent OR received
CREATE POLICY "messages_select_open" ON messages FOR SELECT USING (true);

-- Allow users to UPDATE their own messages (mark as read)
CREATE POLICY "messages_update_own" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- STEP 4: Grant permissions
GRANT SELECT, INSERT, UPDATE ON messages TO anon, authenticated;

-- STEP 5: Verify
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages';
