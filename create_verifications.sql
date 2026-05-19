-- ═══════════════════════════════════════════════
-- Fix: Create verifications table + RLS policies
-- ═══════════════════════════════════════════════

-- 1. Create verifications table
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

-- 3. Admin can view all
DROP POLICY IF EXISTS "verif_admin_select" ON public.verifications;
CREATE POLICY "verif_admin_select" ON public.verifications
  FOR SELECT TO authenticated USING (true);

-- 4. Admin can update all
DROP POLICY IF EXISTS "verif_admin_update" ON public.verifications;
CREATE POLICY "verif_admin_update" ON public.verifications
  FOR UPDATE TO authenticated USING (true);

-- 5. Users can insert own
DROP POLICY IF EXISTS "verif_user_insert" ON public.verifications;
CREATE POLICY "verif_user_insert" ON public.verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 6. Users can view own
DROP POLICY IF EXISTS "verif_user_select" ON public.verifications;
CREATE POLICY "verif_user_select" ON public.verifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. Verify
SELECT 'verifications table created!' as result;
