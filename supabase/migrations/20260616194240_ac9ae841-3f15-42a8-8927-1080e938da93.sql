
-- =============================================================================
-- Trust & Verification Center — MVP schema (fixed)
-- =============================================================================

DO $$ BEGIN CREATE TYPE public.profile_kind AS ENUM ('service_profile','business_page');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.trust_level AS ENUM (
  'new','phone_verified','profile_complete','reviewed_provider',
  'verified_provider','verified_business','verified_organization',
  'under_review','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.verification_request_status AS ENUM (
  'pending','more_info','approved','rejected','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.verification_request_type AS ENUM (
  'verified_provider','verified_business','verified_organization');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.profile_report_status AS ENUM (
  'open','reviewed','dismissed','action_taken');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profile_trust_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_kind public.profile_kind NOT NULL,
  profile_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  auto_level public.trust_level NOT NULL DEFAULT 'new',
  manual_level public.trust_level,
  manual_reason text,
  manual_set_by uuid,
  manual_set_at timestamptz,
  reports_count integer NOT NULL DEFAULT 0,
  last_recomputed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_kind, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_pts_owner ON public.profile_trust_status (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pts_manual ON public.profile_trust_status (manual_level) WHERE manual_level IS NOT NULL;
GRANT SELECT ON public.profile_trust_status TO authenticated;
GRANT ALL ON public.profile_trust_status TO service_role;
ALTER TABLE public.profile_trust_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pts_select_owner_or_staff ON public.profile_trust_status;
CREATE POLICY pts_select_owner_or_staff ON public.profile_trust_status
  FOR SELECT TO authenticated USING (
    owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE IF NOT EXISTS public.profile_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_kind public.profile_kind NOT NULL,
  profile_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  requested_type public.verification_request_type NOT NULL,
  status public.verification_request_status NOT NULL DEFAULT 'pending',
  full_name text, contact_person text, business_name text,
  phone text, location text, experience_summary text,
  admin_note text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pvr_profile ON public.profile_verification_requests (profile_kind, profile_id);
CREATE INDEX IF NOT EXISTS idx_pvr_owner ON public.profile_verification_requests (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pvr_status ON public.profile_verification_requests (status);
GRANT SELECT, INSERT, UPDATE ON public.profile_verification_requests TO authenticated;
GRANT ALL ON public.profile_verification_requests TO service_role;
ALTER TABLE public.profile_verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pvr_select_owner_or_staff ON public.profile_verification_requests;
CREATE POLICY pvr_select_owner_or_staff ON public.profile_verification_requests
  FOR SELECT TO authenticated USING (
    owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS pvr_insert_owner ON public.profile_verification_requests;
CREATE POLICY pvr_insert_owner ON public.profile_verification_requests
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS pvr_update_owner_pending ON public.profile_verification_requests;
CREATE POLICY pvr_update_owner_pending ON public.profile_verification_requests
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() AND status IN ('pending','more_info'))
  WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS pvr_update_staff ON public.profile_verification_requests;
CREATE POLICY pvr_update_staff ON public.profile_verification_requests
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE IF NOT EXISTS public.verification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.profile_verification_requests(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  doc_type text NOT NULL,
  storage_path text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ve_request ON public.verification_evidence (request_id);
GRANT SELECT, INSERT, DELETE ON public.verification_evidence TO authenticated;
GRANT ALL ON public.verification_evidence TO service_role;
ALTER TABLE public.verification_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ve_select_owner_or_staff ON public.verification_evidence;
CREATE POLICY ve_select_owner_or_staff ON public.verification_evidence
  FOR SELECT TO authenticated USING (
    owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS ve_insert_owner ON public.verification_evidence;
CREATE POLICY ve_insert_owner ON public.verification_evidence
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS ve_delete_owner ON public.verification_evidence;
CREATE POLICY ve_delete_owner ON public.verification_evidence
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.profile_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_kind public.profile_kind NOT NULL,
  profile_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status public.profile_report_status NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pr_profile ON public.profile_reports (profile_kind, profile_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.profile_reports (status);
GRANT SELECT, INSERT ON public.profile_reports TO authenticated;
GRANT ALL ON public.profile_reports TO service_role;
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pr_select_self_or_staff ON public.profile_reports;
CREATE POLICY pr_select_self_or_staff ON public.profile_reports
  FOR SELECT TO authenticated USING (
    reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS pr_insert_self ON public.profile_reports;
CREATE POLICY pr_insert_self ON public.profile_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS pr_update_staff ON public.profile_reports;
CREATE POLICY pr_update_staff ON public.profile_reports
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE IF NOT EXISTS public.profile_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_kind public.profile_kind NOT NULL,
  profile_id uuid NOT NULL,
  author_id uuid NOT NULL,
  note text NOT NULL,
  related_request_id uuid REFERENCES public.profile_verification_requests(id) ON DELETE SET NULL,
  related_report_id uuid REFERENCES public.profile_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pan_profile ON public.profile_admin_notes (profile_kind, profile_id);
GRANT SELECT, INSERT ON public.profile_admin_notes TO authenticated;
GRANT ALL ON public.profile_admin_notes TO service_role;
ALTER TABLE public.profile_admin_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pan_staff_only_select ON public.profile_admin_notes;
CREATE POLICY pan_staff_only_select ON public.profile_admin_notes
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
DROP POLICY IF EXISTS pan_staff_only_insert ON public.profile_admin_notes;
CREATE POLICY pan_staff_only_insert ON public.profile_admin_notes
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')));

CREATE TABLE IF NOT EXISTS public.trust_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  profile_kind public.profile_kind,
  profile_id uuid,
  owner_user_id uuid,
  prev_level public.trust_level,
  new_level public.trust_level,
  related_request_id uuid,
  related_report_id uuid,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tal_profile ON public.trust_audit_log (profile_kind, profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tal_created ON public.trust_audit_log (created_at DESC);
GRANT SELECT ON public.trust_audit_log TO authenticated;
GRANT ALL ON public.trust_audit_log TO service_role;
ALTER TABLE public.trust_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tal_staff_only ON public.trust_audit_log;
CREATE POLICY tal_staff_only ON public.trust_audit_log
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE IF NOT EXISTS public.trust_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  manual_verification_open boolean NOT NULL DEFAULT true,
  documents_required boolean NOT NULL DEFAULT false,
  min_completed_jobs_for_reviewed integer NOT NULL DEFAULT 1,
  min_verified_reviews_for_reviewed integer NOT NULL DEFAULT 1,
  report_auto_flag_threshold integer NOT NULL DEFAULT 3,
  allow_boost_unverified boolean NOT NULL DEFAULT true,
  show_badges_publicly boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.trust_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.trust_settings TO authenticated, anon;
GRANT ALL ON public.trust_settings TO service_role;
ALTER TABLE public.trust_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ts_read_all ON public.trust_settings;
CREATE POLICY ts_read_all ON public.trust_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS ts_update_admin ON public.trust_settings;
CREATE POLICY ts_update_admin ON public.trust_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helpers + recompute --------------------------------------------------------

CREATE OR REPLACE FUNCTION public._trust_profile_owner(_kind public.profile_kind, _id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE _kind
    WHEN 'service_profile' THEN (SELECT user_id FROM public.service_profiles WHERE user_id = _id)
    WHEN 'business_page'   THEN (SELECT owner_id FROM public.business_pages WHERE id = _id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_profile_trust(_kind public.profile_kind, _id uuid)
RETURNS public.trust_level
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  owner uuid;
  phone_ok boolean := false;
  complete_ok boolean := false;
  reviewed_ok boolean := false;
  computed public.trust_level := 'new';
  jobs_count integer; review_count integer;
  cfg record;
BEGIN
  owner := public._trust_profile_owner(_kind, _id);
  IF owner IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO cfg FROM public.trust_settings WHERE id = 1;

  SELECT (phone_confirmed_at IS NOT NULL) INTO phone_ok FROM auth.users WHERE id = owner;
  phone_ok := COALESCE(phone_ok, false);

  IF _kind = 'service_profile' THEN
    SELECT
      (sp.cover_url IS NOT NULL OR EXISTS (SELECT 1 FROM public.profiles pp WHERE pp.id = owner AND pp.avatar_url IS NOT NULL))
      AND sp.category_slug IS NOT NULL AND sp.category_slug <> ''
      AND (sp.district <> '' OR sp.town <> '')
      AND sp.bio <> ''
      AND COALESCE(sp.phone, sp.whatsapp, sp.email) IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profile_services ps
        JOIN public.public_profiles pp2 ON pp2.id = ps.profile_id
        WHERE pp2.owner_id = owner AND ps.active = true
      )
      AS complete
    INTO complete_ok FROM public.service_profiles sp WHERE sp.user_id = _id;
    complete_ok := COALESCE(complete_ok, false);

    SELECT count(*) INTO jobs_count FROM public.service_requests
      WHERE provider_id = owner AND status = 'completed';
    SELECT count(*) INTO review_count FROM public.reviews
      WHERE provider_user_id = owner AND hidden = false;
    reviewed_ok := (jobs_count >= cfg.min_completed_jobs_for_reviewed
                AND review_count >= cfg.min_verified_reviews_for_reviewed);
  ELSIF _kind = 'business_page' THEN
    SELECT
      bp.logo_url IS NOT NULL
      AND bp.category_slug IS NOT NULL AND bp.category_slug <> ''
      AND (COALESCE(bp.district,'') <> '' OR COALESCE(bp.town,'') <> '')
      AND COALESCE(bp.description,'') <> ''
      AND COALESCE(array_length(bp.services,1),0) >= 1
      AND COALESCE(bp.contact_phone, bp.whatsapp, bp.email) IS NOT NULL
      AS complete
    INTO complete_ok FROM public.business_pages bp WHERE bp.id = _id;
    complete_ok := COALESCE(complete_ok, false);
    reviewed_ok := false;
  END IF;

  IF reviewed_ok THEN computed := 'reviewed_provider';
  ELSIF complete_ok THEN computed := 'profile_complete';
  ELSIF phone_ok    THEN computed := 'phone_verified';
  ELSE                   computed := 'new'; END IF;

  INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, auto_level, last_recomputed_at, updated_at)
  VALUES (_kind, _id, owner, computed, now(), now())
  ON CONFLICT (profile_kind, profile_id) DO UPDATE
    SET auto_level = EXCLUDED.auto_level,
        owner_user_id = EXCLUDED.owner_user_id,
        last_recomputed_at = now(), updated_at = now();
  RETURN computed;
END $$;

CREATE OR REPLACE FUNCTION public.get_profile_trust_badge(_kind public.profile_kind, _id uuid)
RETURNS public.trust_level
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(manual_level, auto_level)
    FROM public.profile_trust_status WHERE profile_kind = _kind AND profile_id = _id;
$$;

CREATE OR REPLACE FUNCTION public._tg_recompute_service_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.recompute_profile_trust('service_profile', COALESCE(NEW.user_id, OLD.user_id)); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public._tg_recompute_business_page()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.recompute_profile_trust('business_page', COALESCE(NEW.id, OLD.id)); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public._tg_recompute_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.recompute_profile_trust('service_profile', NEW.provider_user_id); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public._tg_recompute_on_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL AND NEW.status = 'completed' THEN
    PERFORM public.recompute_profile_trust('service_profile', NEW.provider_id);
  END IF; RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recompute_sp ON public.service_profiles;
CREATE TRIGGER trg_recompute_sp AFTER INSERT OR UPDATE ON public.service_profiles
  FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_service_profile();
DROP TRIGGER IF EXISTS trg_recompute_bp ON public.business_pages;
CREATE TRIGGER trg_recompute_bp AFTER INSERT OR UPDATE ON public.business_pages
  FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_business_page();
DROP TRIGGER IF EXISTS trg_recompute_reviews ON public.reviews;
CREATE TRIGGER trg_recompute_reviews AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_on_review();
DROP TRIGGER IF EXISTS trg_recompute_request_status ON public.service_requests;
CREATE TRIGGER trg_recompute_request_status AFTER UPDATE OF status ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public._tg_recompute_on_request_status();

-- Admin RPCs -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_trust_level(
  _kind public.profile_kind, _id uuid, _level public.trust_level, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev public.trust_level; owner uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  owner := public._trust_profile_owner(_kind, _id);
  IF owner IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  SELECT COALESCE(manual_level, auto_level) INTO prev
    FROM public.profile_trust_status WHERE profile_kind=_kind AND profile_id=_id;
  INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, manual_level, manual_reason, manual_set_by, manual_set_at, updated_at)
    VALUES (_kind, _id, owner, _level, _reason, auth.uid(), now(), now())
  ON CONFLICT (profile_kind, profile_id) DO UPDATE
    SET manual_level=_level, manual_reason=_reason, manual_set_by=auth.uid(), manual_set_at=now(), updated_at=now();
  IF _kind='service_profile' THEN
    UPDATE public.service_profiles
       SET verified = CASE WHEN _level IN ('verified_provider','verified_business','verified_organization') THEN 'verified'::verification_status
                           WHEN _level='suspended' THEN verified ELSE 'none'::verification_status END,
           suspended = (_level = 'suspended')
     WHERE user_id = _id;
  ELSE
    UPDATE public.business_pages
       SET verified = CASE WHEN _level IN ('verified_provider','verified_business','verified_organization') THEN 'verified' ELSE 'none' END,
           suspended = (_level = 'suspended')
     WHERE id = _id;
  END IF;
  INSERT INTO public.trust_audit_log (actor_id, action, profile_kind, profile_id, owner_user_id, prev_level, new_level, reason)
    VALUES (auth.uid(), 'trust_level_changed', _kind, _id, owner, prev, _level, _reason);
  PERFORM public.create_notification(owner, auth.uid(), 'trust_level_changed', 'profile', _id::text,
    CASE _level
      WHEN 'suspended' THEN 'Your profile has been suspended. Contact support for details.'
      WHEN 'under_review' THEN 'Your profile is currently under review.'
      WHEN 'verified_provider' THEN 'Your profile is now Verified Provider on Tuungane'
      WHEN 'verified_business' THEN 'Your profile is now Verified Business on Tuungane'
      WHEN 'verified_organization' THEN 'Your profile is now Verified Organization on Tuungane'
      ELSE 'Your profile trust level has been updated' END);
END $$;

CREATE OR REPLACE FUNCTION public.admin_clear_manual_trust_level(
  _kind public.profile_kind, _id uuid, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev public.trust_level; owner uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  SELECT manual_level, owner_user_id INTO prev, owner FROM public.profile_trust_status
    WHERE profile_kind=_kind AND profile_id=_id;
  UPDATE public.profile_trust_status SET manual_level=NULL, manual_reason=_reason,
    manual_set_by=auth.uid(), manual_set_at=now(), updated_at=now()
   WHERE profile_kind=_kind AND profile_id=_id;
  IF _kind='service_profile' THEN
    UPDATE public.service_profiles SET verified='none'::verification_status, suspended=false WHERE user_id=_id;
  ELSE
    UPDATE public.business_pages SET verified='none', suspended=false WHERE id=_id;
  END IF;
  PERFORM public.recompute_profile_trust(_kind, _id);
  INSERT INTO public.trust_audit_log (actor_id, action, profile_kind, profile_id, owner_user_id, prev_level, reason)
    VALUES (auth.uid(),'manual_level_cleared',_kind,_id,owner,prev,_reason);
END $$;

CREATE OR REPLACE FUNCTION public.admin_decide_verification_request(
  _request_id uuid, _decision text, _admin_note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; new_level public.trust_level;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.profile_verification_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF _decision = 'approve' THEN
    new_level := r.requested_type::text::public.trust_level;
    UPDATE public.profile_verification_requests SET status='approved', admin_note=COALESCE(_admin_note,admin_note),
      reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_request_id;
    PERFORM public.admin_set_trust_level(r.profile_kind, r.profile_id, new_level, 'verification request approved');
    PERFORM public.create_notification(r.owner_user_id, auth.uid(), 'verification_approved',
      'profile', r.profile_id::text, 'Your verification request was approved');
  ELSIF _decision = 'reject' THEN
    UPDATE public.profile_verification_requests SET status='rejected', admin_note=COALESCE(_admin_note,admin_note),
      reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_request_id;
    PERFORM public.create_notification(r.owner_user_id, auth.uid(), 'verification_rejected',
      'profile', r.profile_id::text,
      'Your verification request was not approved' || CASE WHEN _admin_note IS NOT NULL AND _admin_note<>'' THEN ': '||_admin_note ELSE '' END);
  ELSIF _decision = 'more_info' THEN
    UPDATE public.profile_verification_requests SET status='more_info', admin_note=COALESCE(_admin_note,admin_note),
      reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_request_id;
    PERFORM public.create_notification(r.owner_user_id, auth.uid(), 'verification_more_info',
      'profile', r.profile_id::text,
      'We need a bit more info for your verification request' || CASE WHEN _admin_note IS NOT NULL AND _admin_note<>'' THEN ': '||_admin_note ELSE '' END);
  ELSIF _decision = 'revoke' THEN
    UPDATE public.profile_verification_requests SET status='revoked', admin_note=COALESCE(_admin_note,admin_note),
      reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_request_id;
    PERFORM public.admin_clear_manual_trust_level(r.profile_kind, r.profile_id, 'verification revoked');
    PERFORM public.create_notification(r.owner_user_id, auth.uid(), 'verification_revoked',
      'profile', r.profile_id::text, 'Your verified status has been revoked');
  ELSE RAISE EXCEPTION 'invalid decision'; END IF;
  INSERT INTO public.trust_audit_log (actor_id, action, profile_kind, profile_id, owner_user_id, related_request_id, reason)
    VALUES (auth.uid(), 'verification_' || _decision, r.profile_kind, r.profile_id, r.owner_user_id, _request_id, _admin_note);
END $$;

CREATE OR REPLACE FUNCTION public.admin_add_profile_note(
  _kind public.profile_kind, _id uuid, _note text,
  _related_request_id uuid DEFAULT NULL, _related_report_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE note_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  INSERT INTO public.profile_admin_notes (profile_kind, profile_id, author_id, note, related_request_id, related_report_id)
    VALUES (_kind, _id, auth.uid(), _note, _related_request_id, _related_report_id) RETURNING id INTO note_id;
  INSERT INTO public.trust_audit_log (actor_id, action, profile_kind, profile_id, reason)
    VALUES (auth.uid(), 'admin_note_added', _kind, _id, left(_note, 200));
  RETURN note_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_profile_report(
  _report_id uuid, _resolution text, _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; new_status public.profile_report_status;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.profile_reports WHERE id=_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found'; END IF;
  new_status := CASE _resolution WHEN 'dismiss' THEN 'dismissed' WHEN 'review' THEN 'reviewed' ELSE 'action_taken' END;
  UPDATE public.profile_reports SET status=new_status, resolved_by=auth.uid(), resolved_at=now(), resolution_note=_note
    WHERE id=_report_id;
  INSERT INTO public.trust_audit_log (actor_id, action, profile_kind, profile_id, related_report_id, reason)
    VALUES (auth.uid(), 'report_' || _resolution, r.profile_kind, r.profile_id, _report_id, _note);
END $$;

CREATE OR REPLACE FUNCTION public._tg_profile_report_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.profile_trust_status
     SET reports_count = (SELECT count(*) FROM public.profile_reports
                           WHERE profile_kind = COALESCE(NEW.profile_kind, OLD.profile_kind)
                             AND profile_id   = COALESCE(NEW.profile_id, OLD.profile_id)
                             AND status = 'open'),
         updated_at = now()
   WHERE profile_kind = COALESCE(NEW.profile_kind, OLD.profile_kind)
     AND profile_id   = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_profile_report_count ON public.profile_reports;
CREATE TRIGGER trg_profile_report_count AFTER INSERT OR UPDATE OR DELETE ON public.profile_reports
  FOR EACH ROW EXECUTE FUNCTION public._tg_profile_report_count();

DROP TRIGGER IF EXISTS trg_pts_updated ON public.profile_trust_status;
CREATE TRIGGER trg_pts_updated BEFORE UPDATE ON public.profile_trust_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pvr_updated ON public.profile_verification_requests;
CREATE TRIGGER trg_pvr_updated BEFORE UPDATE ON public.profile_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill -------------------------------------------------------------------

INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, auto_level)
SELECT 'service_profile'::public.profile_kind, sp.user_id, sp.user_id, 'new'::public.trust_level
  FROM public.service_profiles sp
ON CONFLICT (profile_kind, profile_id) DO NOTHING;

INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, auto_level)
SELECT 'business_page'::public.profile_kind, bp.id, bp.owner_id, 'new'::public.trust_level
  FROM public.business_pages bp
ON CONFLICT (profile_kind, profile_id) DO NOTHING;

UPDATE public.profile_trust_status pts
   SET manual_level = 'verified_provider', manual_set_at = now()
  FROM public.service_profiles sp
 WHERE pts.profile_kind='service_profile' AND pts.profile_id = sp.user_id
   AND sp.verified = 'verified' AND pts.manual_level IS NULL;

UPDATE public.profile_trust_status pts
   SET manual_level = CASE WHEN bp.org_type='business' THEN 'verified_business'::public.trust_level
                           ELSE 'verified_organization'::public.trust_level END,
       manual_set_at = now()
  FROM public.business_pages bp
 WHERE pts.profile_kind='business_page' AND pts.profile_id = bp.id
   AND bp.verified = 'verified' AND pts.manual_level IS NULL;

UPDATE public.profile_trust_status pts
   SET manual_level = 'suspended', manual_set_at = now()
  FROM public.service_profiles sp
 WHERE pts.profile_kind='service_profile' AND pts.profile_id = sp.user_id
   AND sp.suspended = true AND pts.manual_level IS NULL;

UPDATE public.profile_trust_status pts
   SET manual_level = 'suspended', manual_set_at = now()
  FROM public.business_pages bp
 WHERE pts.profile_kind='business_page' AND pts.profile_id = bp.id
   AND bp.suspended = true AND pts.manual_level IS NULL;

DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.service_profiles LOOP
    PERFORM public.recompute_profile_trust('service_profile', r.user_id);
  END LOOP;
  FOR r IN SELECT id FROM public.business_pages LOOP
    PERFORM public.recompute_profile_trust('business_page', r.id);
  END LOOP;
END $$;
