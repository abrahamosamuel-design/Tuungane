
DO $$ BEGIN
  CREATE TYPE public.service_provider_type AS ENUM ('individual', 'business', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.service_profiles
  ADD COLUMN IF NOT EXISTS provider_type public.service_provider_type NOT NULL DEFAULT 'individual';
