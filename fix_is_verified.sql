-- ═══════════════════════════════════════════════
-- Fix: Add is_verified column to profiles
-- ═══════════════════════════════════════════════

-- 1. Add is_verified column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Set default for existing rows
UPDATE public.profiles 
SET is_verified = false 
WHERE is_verified IS NULL;

-- 3. Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('is_verified', 'verification_status', 'role', 'name')
ORDER BY column_name;
