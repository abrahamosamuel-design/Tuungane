-- =========================================================
-- BUSINESS / ORGANIZATION PAGES
-- =========================================================

CREATE TABLE public.business_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  org_type text NOT NULL DEFAULT 'business',
  category_slug text,
  subcategory text,
  description text NOT NULL DEFAULT '',
  logo_url text,
  cover_url text,
  district text,
  town text,
  area text,
  address text,
  contact_phone text,
  whatsapp text,
  email text,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  services text[] NOT NULL DEFAULT '{}',
  products text[] NOT NULL DEFAULT '{}',
  verified text NOT NULL DEFAULT 'none' CHECK (verified IN ('none','pending','verified')),
  is_featured boolean NOT NULL DEFAULT false,
  suspended boolean NOT NULL DEFAULT false,
  seeded_by_official boolean NOT NULL DEFAULT false,
  claim_status text NOT NULL DEFAULT 'owned' CHECK (claim_status IN ('owned','unclaimed','claim_pending','claimed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_pages_owner ON public.business_pages(owner_id);
CREATE INDEX idx_business_pages_category ON public.business_pages(category_slug);
CREATE INDEX idx_business_pages_featured ON public.business_pages(is_featured) WHERE is_featured = true;

GRANT SELECT ON public.business_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_pages TO authenticated;
GRANT ALL ON public.business_pages TO service_role;

ALTER TABLE public.business_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY bpages_read_all ON public.business_pages FOR SELECT USING (
  suspended = false OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);
CREATE POLICY bpages_insert_own ON public.business_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY bpages_update_own_or_admin ON public.business_pages FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY bpages_delete_own_or_admin ON public.business_pages FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_bpages_updated BEFORE UPDATE ON public.business_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Followers ------------------------------------------------
CREATE TABLE public.business_followers (
  business_page_id uuid NOT NULL,
  follower_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_page_id, follower_id)
);
CREATE INDEX idx_bfollow_user ON public.business_followers(follower_id);

GRANT SELECT ON public.business_followers TO anon, authenticated;
GRANT INSERT, DELETE ON public.business_followers TO authenticated;
GRANT ALL ON public.business_followers TO service_role;

ALTER TABLE public.business_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY bfollow_read_all ON public.business_followers FOR SELECT USING (true);
CREATE POLICY bfollow_insert_own ON public.business_followers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY bfollow_delete_own ON public.business_followers FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Link posts / opportunities to a business page ------------
ALTER TABLE public.timeline_posts ADD COLUMN IF NOT EXISTS business_page_id uuid;
CREATE INDEX IF NOT EXISTS idx_timeline_posts_business ON public.timeline_posts(business_page_id);

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS business_page_id uuid;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_opportunities_business ON public.opportunities(business_page_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_archived ON public.opportunities(archived);

-- Archive disallowed opportunity types (keep gigs/jobs/internships/volunteer/apprenticeships only)
UPDATE public.opportunities
   SET archived = true, updated_at = now()
 WHERE archived = false
   AND opportunity_type::text NOT IN ('gig','job','internship','volunteer','apprenticeship');