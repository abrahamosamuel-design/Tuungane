
-- Enums
CREATE TYPE public.service_request_status AS ENUM ('requested','accepted','in_progress','completed','cancelled','disputed');
CREATE TYPE public.service_urgency AS ENUM ('normal','urgent','emergency');
CREATE TYPE public.contact_method AS ENUM ('phone','whatsapp','in_app','any');
CREATE TYPE public.dispute_status AS ENUM ('open','reviewing','resolved','dismissed');

-- service_requests
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  service_profile_id uuid,
  category_slug text,
  subcategory text,
  service_needed text NOT NULL,
  location text NOT NULL DEFAULT '',
  district text,
  town text,
  area text,
  description text NOT NULL DEFAULT '',
  preferred_date date,
  preferred_time text,
  urgency public.service_urgency NOT NULL DEFAULT 'normal',
  budget_range text,
  preferred_contact_method public.contact_method NOT NULL DEFAULT 'any',
  customer_phone text,
  customer_whatsapp text,
  attachment_url text,
  status public.service_request_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  disputed_at timestamptz,
  CONSTRAINT no_self_request CHECK (customer_id <> provider_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY sr_read_parties ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY sr_insert_customer ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id AND customer_id <> provider_id);
CREATE POLICY sr_update_parties ON public.service_requests FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = provider_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY sr_delete_admin ON public.service_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_sr_customer ON public.service_requests(customer_id, created_at DESC);
CREATE INDEX idx_sr_provider ON public.service_requests(provider_id, created_at DESC);
CREATE INDEX idx_sr_status ON public.service_requests(status);

-- status history
CREATE TABLE public.service_request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  old_status public.service_request_status,
  new_status public.service_request_status NOT NULL,
  changed_by_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.service_request_status_history TO authenticated;
GRANT ALL ON public.service_request_status_history TO service_role;
ALTER TABLE public.service_request_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY srsh_read_parties ON public.service_request_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = service_request_id
    AND (r.customer_id = auth.uid() OR r.provider_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))));
CREATE POLICY srsh_insert_system ON public.service_request_status_history FOR INSERT TO authenticated WITH CHECK (true);

-- service_feedback
CREATE TABLE public.service_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL UNIQUE REFERENCES public.service_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  did_use_provider boolean NOT NULL DEFAULT true,
  was_completed boolean NOT NULL DEFAULT true,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  would_recommend boolean NOT NULL DEFAULT true,
  service_provided text NOT NULL DEFAULT '',
  review_text text NOT NULL DEFAULT '',
  was_on_time text,
  work_quality_good text,
  price_fair text,
  would_use_again text,
  issue_reported boolean NOT NULL DEFAULT false,
  issue_description text,
  is_verified_review boolean NOT NULL DEFAULT true,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_review CHECK (customer_id <> provider_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_feedback TO authenticated;
GRANT SELECT ON public.service_feedback TO anon;
GRANT ALL ON public.service_feedback TO service_role;
ALTER TABLE public.service_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY sf_read_visible ON public.service_feedback FOR SELECT TO public
  USING (is_visible = true OR auth.uid() = customer_id OR auth.uid() = provider_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY sf_insert_customer ON public.service_feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id AND customer_id <> provider_id
    AND EXISTS (SELECT 1 FROM public.service_requests r
      WHERE r.id = service_request_id AND r.customer_id = auth.uid()
        AND r.provider_id = service_feedback.provider_id
        AND r.status = 'completed')
  );
CREATE POLICY sf_update_author_window ON public.service_feedback FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id AND created_at > now() - interval '7 days')
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY sf_update_mod ON public.service_feedback FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY sf_delete_admin ON public.service_feedback FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_sf_provider ON public.service_feedback(provider_id, created_at DESC);

-- disputes
CREATE TABLE public.service_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  raised_by_user_id uuid NOT NULL,
  against_user_id uuid NOT NULL,
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_by_admin_id uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_disputes TO authenticated;
GRANT ALL ON public.service_disputes TO service_role;
ALTER TABLE public.service_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_read_parties ON public.service_disputes FOR SELECT TO authenticated
  USING (auth.uid() = raised_by_user_id OR auth.uid() = against_user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE POLICY sd_insert_party ON public.service_disputes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = raised_by_user_id);
CREATE POLICY sd_update_admin ON public.service_disputes FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- updated_at triggers
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sf_updated BEFORE UPDATE ON public.service_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- status change tracking + notifications
CREATE OR REPLACE FUNCTION public.handle_service_request_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.service_request_status_history(service_request_id, old_status, new_status, changed_by_user_id)
      VALUES (NEW.id, NULL, NEW.status, NEW.customer_id);
    PERFORM public.create_notification(NEW.provider_id, NEW.customer_id, 'request_new', 'service_request', NEW.id::text, 'sent you a new service request');
    RETURN NEW;
  END IF;

  IF NEW.status <> OLD.status THEN
    INSERT INTO public.service_request_status_history(service_request_id, old_status, new_status, changed_by_user_id)
      VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN NEW.cancelled_at := now(); END IF;
    IF NEW.status = 'disputed' AND NEW.disputed_at IS NULL THEN NEW.disputed_at := now(); END IF;

    IF NEW.status = 'accepted' THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_accepted', 'service_request', NEW.id::text, 'accepted your service request');
    ELSIF NEW.status = 'in_progress' THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_in_progress', 'service_request', NEW.id::text, 'started your service');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.create_notification(NEW.customer_id, NEW.provider_id, 'request_completed', 'service_request', NEW.id::text, 'marked the service completed — leave feedback');
      PERFORM public.create_notification(NEW.provider_id, NEW.customer_id, 'request_completed', 'service_request', NEW.id::text, 'service marked completed');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.create_notification(
        CASE WHEN auth.uid() = NEW.customer_id THEN NEW.provider_id ELSE NEW.customer_id END,
        auth.uid(), 'request_cancelled', 'service_request', NEW.id::text, 'cancelled a service request');
    ELSIF NEW.status = 'disputed' THEN
      PERFORM public.create_notification(
        CASE WHEN auth.uid() = NEW.customer_id THEN NEW.provider_id ELSE NEW.customer_id END,
        auth.uid(), 'dispute_opened', 'service_request', NEW.id::text, 'opened a dispute on a service request');
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sr_status AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_request_status();
CREATE TRIGGER trg_sr_status_upd BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_request_status();

-- feedback notification
CREATE OR REPLACE FUNCTION public.handle_service_feedback()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.provider_id, NEW.customer_id, 'feedback_received', 'service_feedback', NEW.id::text, 'left you a verified service review');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_sf_notify AFTER INSERT ON public.service_feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_feedback();

-- provider trust stats VIEW
CREATE OR REPLACE VIEW public.provider_trust_stats AS
SELECT
  p.id AS provider_id,
  COALESCE(sr.total_requests, 0) AS total_service_requests,
  COALESCE(sr.completed_requests, 0) AS completed_service_requests,
  COALESCE(sr.cancelled_requests, 0) AS cancelled_service_requests,
  COALESCE(sr.disputed_requests, 0) AS disputed_service_requests,
  COALESCE(sf.total_reviews, 0) AS total_verified_reviews,
  COALESCE(sf.avg_rating, 0)::numeric(3,2) AS average_rating,
  COALESCE(rc.total_recommendations, 0) AS total_recommendations,
  COALESCE(fl.total_followers, 0) AS total_followers,
  CASE WHEN COALESCE(sr.total_requests,0) = 0 THEN 0
       ELSE ROUND(100.0 * COALESCE(sr.responded_requests,0) / sr.total_requests) END AS response_rate,
  CASE WHEN COALESCE(sr.total_requests,0) = 0 THEN 0
       ELSE ROUND(100.0 * COALESCE(sr.completed_requests,0) / sr.total_requests) END AS completion_rate
FROM public.profiles p
LEFT JOIN (
  SELECT provider_id,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_requests,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_requests,
    COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_requests,
    COUNT(*) FILTER (WHERE status <> 'requested') AS responded_requests
  FROM public.service_requests GROUP BY provider_id
) sr ON sr.provider_id = p.id
LEFT JOIN (
  SELECT provider_id,
    COUNT(*) AS total_reviews,
    AVG(rating) AS avg_rating
  FROM public.service_feedback WHERE is_visible = true GROUP BY provider_id
) sf ON sf.provider_id = p.id
LEFT JOIN (
  SELECT provider_user_id AS provider_id, COUNT(*) AS total_recommendations
  FROM public.provider_recommendations WHERE hidden = false GROUP BY provider_user_id
) rc ON rc.provider_id = p.id
LEFT JOIN (
  SELECT provider_user_id AS provider_id, COUNT(*) AS total_followers
  FROM public.follows GROUP BY provider_user_id
) fl ON fl.provider_id = p.id;

GRANT SELECT ON public.provider_trust_stats TO anon, authenticated;
