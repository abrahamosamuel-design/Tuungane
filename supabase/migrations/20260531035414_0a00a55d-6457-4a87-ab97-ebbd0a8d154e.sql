
-- Enums
CREATE TYPE public.official_post_type AS ENUM ('opportunity','featured_provider','verified_provider','service_highlight','safety_tip','platform_update','user_education','new_feature','announcement');
CREATE TYPE public.claim_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.seeded_profile_status AS ENUM ('unclaimed','claim_pending','claimed');

-- official_accounts (singleton)
CREATE TABLE public.official_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Tuungane Official',
  bio text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT 'Tuungane – Connect to Opportunity',
  profile_image_url text,
  cover_image_url text,
  is_official boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  posting_enabled boolean NOT NULL DEFAULT true,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.official_accounts TO anon, authenticated;
GRANT ALL ON public.official_accounts TO service_role;
ALTER TABLE public.official_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY oa_read_all ON public.official_accounts FOR SELECT USING (true);
CREATE POLICY oa_admin_insert ON public.official_accounts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY oa_admin_update ON public.official_accounts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY oa_admin_delete ON public.official_accounts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- official_posts
CREATE TABLE public.official_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_account_id uuid NOT NULL,
  post_type public.official_post_type NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  category_slug text,
  subcategory text,
  location text,
  image_url text,
  linked_provider_id uuid,
  linked_opportunity_id uuid,
  contact_info text,
  safety_note text,
  source_verified boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  is_homepage boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'published',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX official_posts_published_idx ON public.official_posts(status, created_at DESC);
CREATE INDEX official_posts_type_idx ON public.official_posts(post_type);
GRANT SELECT ON public.official_posts TO anon, authenticated;
GRANT ALL ON public.official_posts TO service_role;
ALTER TABLE public.official_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_read_published ON public.official_posts FOR SELECT USING (status = 'published' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY op_admin_insert ON public.official_posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY op_admin_update ON public.official_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY op_admin_delete ON public.official_posts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- official_post_likes
CREATE TABLE public.official_post_likes (
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.official_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.official_post_likes TO authenticated;
GRANT ALL ON public.official_post_likes TO service_role;
ALTER TABLE public.official_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY opl_read_all ON public.official_post_likes FOR SELECT USING (true);
CREATE POLICY opl_insert_own ON public.official_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY opl_delete_own ON public.official_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- official_post_comments
CREATE TABLE public.official_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  text text NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opc_post_idx ON public.official_post_comments(post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_post_comments TO authenticated;
GRANT SELECT ON public.official_post_comments TO anon;
GRANT ALL ON public.official_post_comments TO service_role;
ALTER TABLE public.official_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY opc_read_visible ON public.official_post_comments FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY opc_insert_own ON public.official_post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY opc_delete_own_or_mod ON public.official_post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY opc_update_mod ON public.official_post_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- profile_claim_requests
CREATE TABLE public.profile_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_profile_user_id uuid NOT NULL,
  requester_user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  whatsapp_number text,
  email text,
  relationship_to_profile text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  supporting_file_url text,
  status public.claim_status NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile_claim_requests TO authenticated;
GRANT ALL ON public.profile_claim_requests TO service_role;
ALTER TABLE public.profile_claim_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY pcr_read_own_or_admin ON public.profile_claim_requests FOR SELECT TO authenticated USING (auth.uid() = requester_user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY pcr_insert_own ON public.profile_claim_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_user_id);
CREATE POLICY pcr_update_admin ON public.profile_claim_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- service_profiles: seeding fields
ALTER TABLE public.service_profiles
  ADD COLUMN IF NOT EXISTS seeded_by_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seeded_status public.seeded_profile_status;

-- triggers
CREATE TRIGGER update_official_accounts_updated_at BEFORE UPDATE ON public.official_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_official_posts_updated_at BEFORE UPDATE ON public.official_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton (inactive — admin activates from dashboard)
INSERT INTO public.official_accounts (name, bio, tagline, is_active)
VALUES (
  'Tuungane Official',
  'Tuungane Official shares trusted services, skills-based opportunities, featured providers, safety tips, and platform updates to help people connect, grow, and prosper together.',
  'Tuungane – Connect to Opportunity',
  false
);
