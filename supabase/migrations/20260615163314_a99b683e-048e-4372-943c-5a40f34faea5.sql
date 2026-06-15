
-- =========================================================
-- Phase 1: Unified public profiles + services per profile
-- Additive migration. Existing service_profiles and business_pages
-- are preserved; rows are mirrored into the new public_profiles
-- table with a legacy_source pointer for safe cutover later.
-- =========================================================

-- 1. Enum for profile type
DO $$ BEGIN
  CREATE TYPE public.public_profile_type AS ENUM ('individual','business','organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. public_profiles
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type public.public_profile_type NOT NULL DEFAULT 'individual',
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category_slug text,
  subcategory text,
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  cover_url text,
  country text DEFAULT 'Uganda',
  region text,
  district text,
  town text,
  area text,
  address text,
  areas_served text[] NOT NULL DEFAULT '{}',
  latitude double precision,
  longitude double precision,
  service_radius_km integer,
  phone text,
  whatsapp text,
  email text,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified text NOT NULL DEFAULT 'none',
  availability text NOT NULL DEFAULT 'available',
  is_featured boolean NOT NULL DEFAULT false,
  suspended boolean NOT NULL DEFAULT false,
  seeded_by_official boolean NOT NULL DEFAULT false,
  claim_status text NOT NULL DEFAULT 'owned',
  legacy_source text,           -- 'service_profile' | 'business_page' | NULL
  legacy_ref text,              -- service_profiles.user_id::text or business_pages.id::text
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_profiles_verified_check CHECK (verified IN ('none','pending','verified')),
  CONSTRAINT public_profiles_claim_status_check CHECK (claim_status IN ('owned','unclaimed','claim_pending','claimed'))
);

CREATE INDEX IF NOT EXISTS idx_pp_owner ON public.public_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_pp_category ON public.public_profiles(category_slug);
CREATE INDEX IF NOT EXISTS idx_pp_district ON public.public_profiles(district);
CREATE INDEX IF NOT EXISTS idx_pp_town ON public.public_profiles(town);
CREATE INDEX IF NOT EXISTS idx_pp_type ON public.public_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_pp_legacy ON public.public_profiles(legacy_source, legacy_ref);
CREATE INDEX IF NOT EXISTS idx_pp_lat_lng ON public.public_profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY pp_read_public ON public.public_profiles
  FOR SELECT
  USING (
    suspended = false
    OR auth.uid() = owner_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
  );

CREATE POLICY pp_insert_own ON public.public_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY pp_update_own_or_admin ON public.public_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY pp_delete_own_or_admin ON public.public_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pp_updated BEFORE UPDATE ON public.public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. profile_services
CREATE TABLE IF NOT EXISTS public.profile_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.public_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  category_slug text,
  description text NOT NULL DEFAULT '',
  price_guidance_ugx integer,
  photos text[] NOT NULL DEFAULT '{}',
  location_served text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ps_profile ON public.profile_services(profile_id);
CREATE INDEX IF NOT EXISTS idx_ps_active ON public.profile_services(profile_id) WHERE active = true;

GRANT SELECT ON public.profile_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_services TO authenticated;
GRANT ALL ON public.profile_services TO service_role;

ALTER TABLE public.profile_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY ps_read_public ON public.profile_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.public_profiles pp
      WHERE pp.id = profile_services.profile_id
        AND (pp.suspended = false
             OR pp.owner_id = auth.uid()
             OR public.has_role(auth.uid(),'admin')
             OR public.has_role(auth.uid(),'moderator'))
    )
  );

CREATE POLICY ps_insert_owner ON public.profile_services
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.public_profiles pp
            WHERE pp.id = profile_services.profile_id AND pp.owner_id = auth.uid())
  );

CREATE POLICY ps_update_owner_or_admin ON public.profile_services
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.public_profiles pp
            WHERE pp.id = profile_services.profile_id
              AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.public_profiles pp
            WHERE pp.id = profile_services.profile_id
              AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
  );

CREATE POLICY ps_delete_owner_or_admin ON public.profile_services
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.public_profiles pp
            WHERE pp.id = profile_services.profile_id
              AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.profile_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Link service_requests and reviews to the new profile (nullable; legacy code still works)
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profile_service_id uuid REFERENCES public.profile_services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sr_public_profile ON public.service_requests(public_profile_id);

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_public_profile ON public.reviews(public_profile_id);

-- 5. Slug helper
CREATE OR REPLACE FUNCTION public._slugify(_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' FROM
    regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- 6. Backfill from service_profiles (individual providers)
INSERT INTO public.public_profiles (
  owner_id, profile_type, slug, name, category_slug, subcategory, bio,
  avatar_url, cover_url, country, region, district, town, area, areas_served,
  latitude, longitude, service_radius_km, phone, whatsapp, email,
  verified, availability, suspended, seeded_by_official,
  legacy_source, legacy_ref, created_at, updated_at
)
SELECT
  sp.user_id,
  'individual'::public.public_profile_type,
  -- unique slug: base + short hash of user_id
  COALESCE(NULLIF(public._slugify(COALESCE(sp.business_name, pr.full_name)), ''), 'provider')
    || '-' || substr(md5(sp.user_id::text), 1, 6),
  COALESCE(NULLIF(sp.business_name,''), NULLIF(pr.full_name,''), 'Provider'),
  sp.category_slug, sp.subcategory, sp.bio,
  pr.avatar_url, sp.cover_url, sp.country, sp.region, sp.district, sp.town, sp.area, sp.areas_served,
  sp.latitude, sp.longitude, sp.service_radius_km, sp.phone, sp.whatsapp, sp.email,
  sp.verified::text, sp.availability::text, sp.suspended, sp.seeded_by_official,
  'service_profile', sp.user_id::text, sp.created_at, sp.updated_at
FROM public.service_profiles sp
LEFT JOIN public.profiles pr ON pr.id = sp.user_id
ON CONFLICT (slug) DO NOTHING;

-- 7. Backfill from business_pages
INSERT INTO public.public_profiles (
  owner_id, profile_type, slug, name, category_slug, subcategory, bio,
  avatar_url, cover_url, country, region, district, town, area, address,
  latitude, longitude, phone, whatsapp, email, opening_hours,
  verified, is_featured, suspended, seeded_by_official, claim_status,
  legacy_source, legacy_ref, created_at, updated_at
)
SELECT
  bp.owner_id,
  CASE WHEN bp.org_type ILIKE 'org%' OR bp.org_type ILIKE 'institut%' THEN 'organization'::public.public_profile_type
       ELSE 'business'::public.public_profile_type END,
  bp.slug,
  bp.name, bp.category_slug, bp.subcategory, COALESCE(bp.description,''),
  bp.logo_url, bp.cover_url, bp.country, bp.region, bp.district, bp.town, bp.area, bp.address,
  bp.latitude, bp.longitude, bp.contact_phone, bp.whatsapp, bp.email, bp.opening_hours,
  bp.verified, bp.is_featured, bp.suspended, bp.seeded_by_official, bp.claim_status,
  'business_page', bp.id::text, bp.created_at, bp.updated_at
FROM public.business_pages bp
ON CONFLICT (slug) DO NOTHING;

-- 8. Backfill profile_services from business_pages.services[]
INSERT INTO public.profile_services (profile_id, title, category_slug, sort_order)
SELECT pp.id, svc, pp.category_slug, idx
FROM public.public_profiles pp
JOIN public.business_pages bp ON bp.id::text = pp.legacy_ref AND pp.legacy_source = 'business_page'
CROSS JOIN LATERAL unnest(bp.services) WITH ORDINALITY AS s(svc, idx)
WHERE bp.services IS NOT NULL AND array_length(bp.services,1) > 0;

-- 9. For service_profiles, seed a single default service from subcategory so each profile has at least one listing
INSERT INTO public.profile_services (profile_id, title, category_slug, sort_order)
SELECT pp.id, sp.subcategory, sp.category_slug, 0
FROM public.public_profiles pp
JOIN public.service_profiles sp ON sp.user_id::text = pp.legacy_ref AND pp.legacy_source = 'service_profile'
WHERE COALESCE(sp.subcategory,'') <> '';
