-- ═══════════════════════════════════════════════
-- Fix ONLY what's missing (skip existing tables/policies)                          -- ═══════════════════════════════════════════════

-- 1. Create verifications table ONLY (if not exists)
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected')),
  url text NOT NULL,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, doc_type)
);

-- 2. Enable RLS
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies first, then create
DROP POLICY IF EXISTS "verif_select_own" ON public.verifications;
DROP POLICY IF EXISTS "verif_admin_select" ON public.verifications;
DROP POLICY IF EXISTS "verif_admin_update" ON public.verifications;

CREATE POLICY "verif_admin_select" ON public.verifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "verif_admin_update" ON public.verifications
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "verif_user_insert" ON public.verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Fix profiles column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

UPDATE public.profiles 
SET verification_status = 'unverified' 
WHERE verification_status IS NULL;

-- 5. Drop and recreate trips policies (fix existing)
DROP POLICY IF EXISTS "trips_select_all" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;

CREATE POLICY "trips_select_all" ON public.trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trips_insert_own" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);

-- 6. Verify all tables
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'trips') as trips_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'verifications') as verifications_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profiles') as profiles_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'messages') as messages_exists;
