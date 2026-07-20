
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.verification_status AS ENUM ('none','pending','verified','featured');
CREATE TYPE public.availability_status AS ENUM ('available','busy','away');
CREATE TYPE public.report_status AS ENUM ('open','reviewing','resolved','dismissed');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  district TEXT,
  town TEXT,
  bio TEXT,
  is_provider BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- SERVICE PROFILES
-- =========================================================
CREATE TABLE public.service_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  category_slug TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  town TEXT NOT NULL DEFAULT '',
  area TEXT,
  areas_served TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT NOT NULL DEFAULT 0,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  verified public.verification_status NOT NULL DEFAULT 'none',
  availability public.availability_status NOT NULL DEFAULT 'available',
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.service_profiles TO authenticated;
GRANT ALL ON public.service_profiles TO service_role;
ALTER TABLE public.service_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_read_all" ON public.service_profiles FOR SELECT USING (true);
CREATE POLICY "sp_insert_own" ON public.service_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update_own_or_admin" ON public.service_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE INDEX idx_sp_category ON public.service_profiles(category_slug);
CREATE INDEX idx_sp_district ON public.service_profiles(district);

-- =========================================================
-- FOLLOWS
-- =========================================================
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, provider_user_id),
  CHECK (follower_id <> provider_user_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_read_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_provider ON public.follows(provider_user_id);

-- =========================================================
-- TIMELINE POSTS
-- =========================================================
CREATE TABLE public.timeline_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category_slug TEXT,
  location TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_reason TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.timeline_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_posts TO authenticated;
GRANT ALL ON public.timeline_posts TO service_role;
ALTER TABLE public.timeline_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_read_visible" ON public.timeline_posts FOR SELECT USING (hidden = false OR auth.uid() = provider_user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "posts_insert_own" ON public.timeline_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_user_id);
CREATE POLICY "posts_update_own_or_mod" ON public.timeline_posts FOR UPDATE TO authenticated USING (auth.uid() = provider_user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "posts_delete_own_or_admin" ON public.timeline_posts FOR DELETE TO authenticated USING (auth.uid() = provider_user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_posts_provider ON public.timeline_posts(provider_user_id);
CREATE INDEX idx_posts_created ON public.timeline_posts(created_at DESC);
CREATE INDEX idx_posts_category ON public.timeline_posts(category_slug);

-- =========================================================
-- POST LIKES
-- =========================================================
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.timeline_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_read_all" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- POST COMMENTS
-- =========================================================
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.timeline_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_visible" ON public.post_comments FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "comments_insert_own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_mod" ON public.post_comments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "comments_delete_own_or_mod" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE INDEX idx_comments_post ON public.post_comments(post_id);

-- =========================================================
-- PROVIDER RECOMMENDATIONS
-- =========================================================
CREATE TABLE public.provider_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (provider_user_id <> user_id),
  UNIQUE (provider_user_id, user_id)
);
GRANT SELECT ON public.provider_recommendations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_recommendations TO authenticated;
GRANT ALL ON public.provider_recommendations TO service_role;
ALTER TABLE public.provider_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recs_read_visible" ON public.provider_recommendations FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "recs_insert_own" ON public.provider_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recs_update_own_or_mod" ON public.provider_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "recs_delete_own_or_mod" ON public.provider_recommendations FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE INDEX idx_recs_provider ON public.provider_recommendations(provider_user_id);

-- =========================================================
-- REVIEWS
-- =========================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (provider_user_id <> user_id),
  UNIQUE (provider_user_id, user_id)
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read_visible" ON public.reviews FOR SELECT USING (hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own_or_mod" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "reviews_delete_own_or_mod" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE INDEX idx_reviews_provider ON public.reviews(provider_user_id);

-- =========================================================
-- SAVED PROVIDERS
-- =========================================================
CREATE TABLE public.saved_providers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider_user_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_providers TO authenticated;
GRANT ALL ON public.saved_providers TO service_role;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_read_own" ON public.saved_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_insert_own" ON public.saved_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_delete_own" ON public.saved_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- REPORTS
-- =========================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_read_own_or_mod" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "reports_update_mod" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, is_provider)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE((NEW.raw_user_meta_data->>'is_provider')::boolean, false))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('tuungane-media','tuungane-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "media_read" ON storage.objects FOR SELECT USING (bucket_id = 'tuungane-media');
CREATE POLICY "media_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tuungane-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_update_own" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tuungane-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tuungane-media' AND (storage.foldername(name))[1] = auth.uid()::text);
