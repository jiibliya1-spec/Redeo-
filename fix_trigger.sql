-- ═══════════════════════════════════════════════
-- Fix: Drop existing trigger first, then recreate
-- ═══════════════════════════════════════════════

-- 1. Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Recreate function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, is_verified, verification_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'passenger'),
    false,
    'unverified'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
