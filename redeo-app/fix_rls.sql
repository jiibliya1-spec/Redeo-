-- Run this in Supabase Dashboard → SQL Editor

-- Fix RLS: Replace old policy with separate ones
DROP POLICY IF EXISTS "v1" ON public.verifications;

-- Users can VIEW their own verifications
CREATE POLICY "verifications_select_own"
  ON public.verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can INSERT their own verifications
CREATE POLICY "verifications_insert_own"
  ON public.verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own verifications (for re-uploads)
CREATE POLICY "verifications_update_own"
  ON public.verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can view ALL verifications
CREATE POLICY "verifications_admin_view"
  ON public.verifications FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));
