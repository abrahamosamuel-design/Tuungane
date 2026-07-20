
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_identity text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS organisation_name text,
  ADD COLUMN IF NOT EXISTS organisation_type text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS registration_status text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS org_phone text,
  ADD COLUMN IF NOT EXISTS org_email text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_profile_identity_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_profile_identity_check
      CHECK (profile_identity IN ('individual','institution'));
  END IF;
END $$;

UPDATE public.profiles SET profile_identity = 'individual' WHERE profile_identity IS NULL;
