
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS posted_as_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS posted_as_name text,
  ADD COLUMN IF NOT EXISTS posted_as_avatar_url text,
  ADD COLUMN IF NOT EXISTS posted_as_ref_type text,
  ADD COLUMN IF NOT EXISTS posted_as_ref_id uuid;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_posted_as_type_check;
ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_posted_as_type_check
  CHECK (posted_as_type IN ('individual','business'));
