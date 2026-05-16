-- ═══════════════════════════════════════════════
-- WansniAuto - Fix ALL Database Issues
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Add verification_status column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';

-- 2. Ensure all profiles have proper defaults
UPDATE public.profiles 
SET verification_status = 'unverified' 
WHERE verification_status IS NULL;

-- 3. Set unverified users
UPDATE public.profiles 
SET verification_status = 'unverified', is_verified = false 
WHERE is_verified IS NULL;

-- 4. RLS: Allow admin to view ALL profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- 5. RLS: Allow admin to update ALL profiles  
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (true);

-- 6. RLS: Allow admin to view ALL verifications
DROP POLICY IF EXISTS "verif_select_own" ON public.verifications;
CREATE POLICY "verif_select_own" ON public.verifications
  FOR SELECT TO authenticated USING (true);

-- 7. RLS: Allow admin to update ALL verifications
DROP POLICY IF EXISTS "verif_admin_all" ON public.verifications;
CREATE POLICY "verif_admin_all" ON public.verifications
  FOR ALL TO authenticated USING (true);

-- 8. RLS: Allow admin to view ALL trips
DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT TO authenticated USING (true);

-- 9. RLS: Allow admin to manage ALL trips
DROP POLICY IF EXISTS "trips_admin" ON public.trips;
CREATE POLICY "trips_admin" ON public.trips
  FOR ALL TO authenticated USING (true);

-- 10. Verify the columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 11. Show all verification statuses
SELECT id, name, email, role, is_verified, verification_status 
FROM public.profiles 
LIMIT 10;
