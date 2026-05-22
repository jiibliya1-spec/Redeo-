-- ══════════════════════════════════════════════════
  -- WansniAuto KYC System — Database Migration
  -- Run this in Supabase SQL Editor
  -- ══════════════════════════════════════════════════

  -- 1. Add KYC AI columns to verifications table
  ALTER TABLE verifications
    ADD COLUMN IF NOT EXISTS ai_quality_score  NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS blur_score        NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS brightness_score  NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS fraud_score       NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS face_match_score  NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS extracted_text    TEXT,
    ADD COLUMN IF NOT EXISTS ai_verified       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_at       TIMESTAMPTZ;

  -- 2. Add KYC columns to profiles table
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS ai_verification_score NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS verified_at            TIMESTAMPTZ;

  -- 3. Enable RLS on verifications (if not already)
  ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

  -- 4. RLS: Users can only see their own verifications
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verifications' AND policyname='user_own_verifications') THEN
      CREATE POLICY user_own_verifications ON verifications
        FOR ALL USING (auth.uid() = user_id);
    END IF;
  END $$;

  -- 5. RLS: Admins can see all verifications
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verifications' AND policyname='admin_all_verifications') THEN
      CREATE POLICY admin_all_verifications ON verifications
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
  END $$;

  -- 6. Storage bucket 'documents' — ensure it exists with proper access
  INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

  -- 7. Storage RLS: users can only upload to their own folder
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='kyc_user_upload') THEN
      CREATE POLICY kyc_user_upload ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'documents' AND
          auth.uid()::text = split_part(name, '/', 1)
        );
    END IF;
  END $$;

  -- 8. Index for performance
  CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON verifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
  CREATE INDEX IF NOT EXISTS idx_verifications_doc_type ON verifications(doc_type);

  -- ══ Done! ══
  SELECT 'KYC Migration Complete ✅' as result;
  