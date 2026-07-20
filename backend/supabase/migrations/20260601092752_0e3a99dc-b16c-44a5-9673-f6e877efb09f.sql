
DROP VIEW IF EXISTS public.provider_trust_stats;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','matching_only')),
  ADD COLUMN IF NOT EXISTS selected_provider_id uuid,
  ADD COLUMN IF NOT EXISTS completion_code text,
  ADD COLUMN IF NOT EXISTS provider_confirmed_completion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_confirmed_completion boolean NOT NULL DEFAULT false;

ALTER TABLE public.service_feedback
  ADD COLUMN IF NOT EXISTS quality_rating int CHECK (quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS timekeeping_rating int CHECK (timekeeping_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication_rating int CHECK (communication_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS price_fairness_rating int CHECK (price_fairness_rating BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS public.provider_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  message text NOT NULL DEFAULT '',
  quote_amount numeric,
  availability_note text,
  estimated_time text,
  portfolio_post_id uuid,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','viewed','shortlisted','chosen','declined','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, provider_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_responses TO authenticated;
GRANT ALL ON public.provider_responses TO service_role;

ALTER TABLE public.provider_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_insert_provider ON public.provider_responses;
CREATE POLICY pr_insert_provider ON public.provider_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = provider_id
              AND EXISTS (SELECT 1 FROM public.service_requests r
                          WHERE r.id = request_id
                            AND r.status = 'requested'
                            AND r.customer_id <> auth.uid()));

DROP POLICY IF EXISTS pr_read_parties ON public.provider_responses;
CREATE POLICY pr_read_parties ON public.provider_responses
  FOR SELECT TO authenticated
  USING (
    auth.uid() = provider_id
    OR EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.customer_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

DROP POLICY IF EXISTS pr_update_provider ON public.provider_responses;
CREATE POLICY pr_update_provider ON public.provider_responses
  FOR UPDATE TO authenticated
  USING (auth.uid() = provider_id) WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS pr_update_customer ON public.provider_responses;
CREATE POLICY pr_update_customer ON public.provider_responses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.customer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_requests r WHERE r.id = request_id AND r.customer_id = auth.uid()));

DROP POLICY IF EXISTS pr_delete_own ON public.provider_responses;
CREATE POLICY pr_delete_own ON public.provider_responses
  FOR DELETE TO authenticated
  USING (auth.uid() = provider_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_provider_responses_request ON public.provider_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider ON public.provider_responses(provider_id);

DROP TRIGGER IF EXISTS provider_responses_updated_at ON public.provider_responses;
CREATE TRIGGER provider_responses_updated_at
  BEFORE UPDATE ON public.provider_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_provider_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req_customer uuid; code text;
BEGIN
  SELECT customer_id INTO req_customer FROM public.service_requests WHERE id = NEW.request_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(req_customer, NEW.provider_id, 'request_response_new', 'service_request', NEW.request_id::text, 'sent you a response to your service request');
    RETURN NEW;
  END IF;
  IF NEW.status = 'chosen' AND OLD.status <> 'chosen' THEN
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    UPDATE public.service_requests
      SET status = 'accepted', selected_provider_id = NEW.provider_id,
          completion_code = COALESCE(completion_code, code), updated_at = now()
      WHERE id = NEW.request_id AND status = 'requested';
    UPDATE public.provider_responses
      SET status = 'declined', updated_at = now()
      WHERE request_id = NEW.request_id AND id <> NEW.id AND status NOT IN ('declined','withdrawn');
    PERFORM public.create_notification(NEW.provider_id, req_customer, 'request_response_chosen', 'service_request', NEW.request_id::text, 'chose your response — you can now start the job');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS provider_responses_after_insert ON public.provider_responses;
CREATE TRIGGER provider_responses_after_insert
  AFTER INSERT ON public.provider_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_provider_response();

DROP TRIGGER IF EXISTS provider_responses_after_update ON public.provider_responses;
CREATE TRIGGER provider_responses_after_update
  AFTER UPDATE OF status ON public.provider_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_provider_response();

CREATE VIEW public.provider_trust_stats AS
SELECT
  p.id AS provider_id,
  COALESCE(sr.total_service_requests, 0) AS total_service_requests,
  COALESCE(sr.completed_service_requests, 0) AS completed_service_requests,
  COALESCE(sr.cancelled_service_requests, 0) AS cancelled_service_requests,
  COALESCE(sr.disputed_service_requests, 0) AS disputed_service_requests,
  COALESCE(sf.total_verified_reviews, 0) AS total_verified_reviews,
  COALESCE(sf.average_rating, 0)::numeric(3,2) AS average_rating,
  COALESCE(sf.total_recommendations, 0) AS total_recommendations,
  COALESCE(fol.total_followers, 0) AS total_followers,
  CASE WHEN COALESCE(sr.total_service_requests,0) = 0 THEN 0
       ELSE ROUND(100.0 * (sr.total_service_requests - sr.cancelled_service_requests) / sr.total_service_requests)::int END AS response_rate,
  CASE WHEN COALESCE(sr.total_service_requests,0) = 0 THEN 0
       ELSE ROUND(100.0 * sr.completed_service_requests / sr.total_service_requests)::int END AS completion_rate,
  LEAST(100, GREATEST(0,
    50 + LEAST(25, COALESCE(sr.completed_service_requests,0) * 2)
    + (COALESCE(sf.average_rating,0)::int * 4)
    + LEAST(10, COALESCE(sf.total_verified_reviews,0))
    - (COALESCE(sr.disputed_service_requests,0) * 10)
    - (COALESCE(sr.cancelled_service_requests,0) * 2)
  ))::int AS trust_score
FROM public.profiles p
LEFT JOIN (
  SELECT provider_id,
         COUNT(*) AS total_service_requests,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_service_requests,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_service_requests,
         COUNT(*) FILTER (WHERE status = 'disputed') AS disputed_service_requests
  FROM public.service_requests GROUP BY provider_id
) sr ON sr.provider_id = p.id
LEFT JOIN (
  SELECT provider_id,
         COUNT(*) AS total_verified_reviews,
         AVG(rating) AS average_rating,
         COUNT(*) FILTER (WHERE would_recommend) AS total_recommendations
  FROM public.service_feedback WHERE is_visible GROUP BY provider_id
) sf ON sf.provider_id = p.id
LEFT JOIN (
  SELECT provider_user_id AS provider_id, COUNT(*) AS total_followers
  FROM public.follows GROUP BY provider_user_id
) fol ON fol.provider_id = p.id
WHERE p.is_provider = true;

GRANT SELECT ON public.provider_trust_stats TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.matching_requests_for_provider(_provider uuid)
RETURNS SETOF public.service_requests
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.* FROM public.service_requests r
  WHERE r.status = 'requested' AND r.customer_id <> _provider
    AND EXISTS (
      SELECT 1 FROM public.service_profiles sp
      WHERE sp.user_id = _provider
        AND (r.category_slug IS NULL OR sp.category_slug = r.category_slug)
        AND (r.visibility = 'public'
             OR (r.visibility = 'matching_only'
                 AND (r.town IS NULL OR sp.town = r.town
                      OR (sp.areas_served IS NOT NULL AND r.town = ANY(sp.areas_served)))))
    )
  ORDER BY r.created_at DESC LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.matching_requests_for_provider(uuid) TO authenticated;
