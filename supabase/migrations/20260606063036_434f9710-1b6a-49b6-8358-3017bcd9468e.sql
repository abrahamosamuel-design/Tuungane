
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS address_description text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_visibility text NOT NULL DEFAULT 'area',
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_location_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_location_visibility_check
  CHECK (location_visibility IN ('area','town','district','hidden'));

ALTER TABLE public.service_profiles
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS service_radius_km integer;

ALTER TABLE public.business_pages
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Uganda',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.timeline_posts
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_town ON public.profiles(town);
CREATE INDEX IF NOT EXISTS idx_business_pages_district ON public.business_pages(district);
CREATE INDEX IF NOT EXISTS idx_business_pages_town ON public.business_pages(town);
CREATE INDEX IF NOT EXISTS idx_service_requests_district ON public.service_requests(district);
CREATE INDEX IF NOT EXISTS idx_service_requests_town ON public.service_requests(town);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_district ON public.timeline_posts(district);
CREATE INDEX IF NOT EXISTS idx_timeline_posts_town ON public.timeline_posts(town);
