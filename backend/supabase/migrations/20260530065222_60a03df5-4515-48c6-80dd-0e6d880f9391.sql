
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TYPE public.opportunity_type AS ENUM ('gig','job','internship','volunteer','apprenticeship');
CREATE TYPE public.opportunity_status AS ENUM ('pending','approved','rejected','featured','expired');
CREATE TYPE public.poster_type AS ENUM ('individual','business','organization','school','church','ngo','admin');
CREATE TYPE public.application_status AS ENUM ('sent','viewed','accepted','rejected');
CREATE TYPE public.opp_report_status AS ENUM ('open','reviewed','resolved','dismissed');

CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  opportunity_type public.opportunity_type NOT NULL,
  category_slug TEXT NOT NULL,
  subcategory TEXT,
  location TEXT NOT NULL DEFAULT '',
  district TEXT, town TEXT, area TEXT,
  description TEXT NOT NULL,
  requirements TEXT, compensation TEXT,
  deadline DATE,
  contact_phone TEXT, whatsapp_number TEXT, contact_email TEXT,
  image_url TEXT,
  poster_id UUID NOT NULL,
  poster_type public.poster_type NOT NULL DEFAULT 'individual',
  status public.opportunity_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opps_read_visible" ON public.opportunities FOR SELECT
USING (status IN ('approved','featured') OR auth.uid() = poster_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "opps_insert_own" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "opps_update_own_or_mod" ON public.opportunities FOR UPDATE TO authenticated
USING (auth.uid() = poster_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "opps_delete_own_or_admin" ON public.opportunities FOR DELETE TO authenticated
USING (auth.uid() = poster_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_opps_status ON public.opportunities(status);
CREATE INDEX idx_opps_category ON public.opportunities(category_slug);
CREATE INDEX idx_opps_type ON public.opportunities(opportunity_type);
CREATE INDEX idx_opps_poster ON public.opportunities(poster_id);

CREATE TRIGGER opps_updated_at BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.opportunity_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  contact_phone TEXT,
  status public.application_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_applications TO authenticated;
GRANT ALL ON public.opportunity_applications TO service_role;
ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps_read_own_or_poster" ON public.opportunity_applications FOR SELECT TO authenticated
USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.poster_id = auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "apps_insert_own" ON public.opportunity_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "apps_update_poster_or_own" ON public.opportunity_applications FOR UPDATE TO authenticated
USING (auth.uid() = applicant_id OR EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.poster_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "apps_delete_own" ON public.opportunity_applications FOR DELETE TO authenticated USING (auth.uid() = applicant_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.saved_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT ALL ON public.saved_opportunities TO service_role;
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_opps_own" ON public.saved_opportunities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_opps_insert" ON public.saved_opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_opps_delete" ON public.saved_opportunities FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.opportunity_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status public.opp_report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.opportunity_reports TO authenticated;
GRANT ALL ON public.opportunity_reports TO service_role;
ALTER TABLE public.opportunity_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opp_reports_read_own_or_mod" ON public.opportunity_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "opp_reports_insert_own" ON public.opportunity_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "opp_reports_update_mod" ON public.opportunity_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
