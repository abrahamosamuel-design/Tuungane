
-- Appeal status enum
DO $$ BEGIN
  CREATE TYPE public.trust_appeal_status AS ENUM ('open','approved','denied','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trust_appeal_kind AS ENUM ('suspension','under_review','rejected_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profile_trust_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_kind public.profile_kind NOT NULL,
  profile_id uuid NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appeal_kind public.trust_appeal_kind NOT NULL,
  related_request_id uuid REFERENCES public.profile_verification_requests(id) ON DELETE SET NULL,
  message text NOT NULL,
  status public.trust_appeal_status NOT NULL DEFAULT 'open',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pta_profile ON public.profile_trust_appeals(profile_kind, profile_id);
CREATE INDEX IF NOT EXISTS idx_pta_owner ON public.profile_trust_appeals(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pta_status ON public.profile_trust_appeals(status);

GRANT SELECT, INSERT, UPDATE ON public.profile_trust_appeals TO authenticated;
GRANT ALL ON public.profile_trust_appeals TO service_role;

ALTER TABLE public.profile_trust_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY pta_select_owner_or_staff ON public.profile_trust_appeals
  FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
  );

CREATE POLICY pta_insert_owner ON public.profile_trust_appeals
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY pta_update_staff ON public.profile_trust_appeals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER trg_pta_updated_at
  BEFORE UPDATE ON public.profile_trust_appeals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add appeal columns to trust_audit_log if missing
DO $$ BEGIN
  ALTER TABLE public.trust_audit_log ADD COLUMN related_appeal_id uuid REFERENCES public.profile_trust_appeals(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Submit appeal (owner)
CREATE OR REPLACE FUNCTION public.submit_trust_appeal(
  _kind public.profile_kind,
  _id uuid,
  _appeal_kind public.trust_appeal_kind,
  _message text,
  _related_request_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  owner uuid;
  current_manual public.trust_level;
  req record;
  new_id uuid;
  admin_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _message IS NULL OR length(trim(_message)) < 10 THEN
    RAISE EXCEPTION 'message must be at least 10 characters';
  END IF;

  owner := public._trust_profile_owner(_kind, _id);
  IF owner IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF owner <> auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;

  -- Validate appeal_kind matches current state
  IF _appeal_kind IN ('suspension','under_review') THEN
    SELECT manual_level INTO current_manual FROM public.profile_trust_status
      WHERE profile_kind = _kind AND profile_id = _id;
    IF _appeal_kind = 'suspension' AND current_manual <> 'suspended' THEN
      RAISE EXCEPTION 'profile is not suspended';
    END IF;
    IF _appeal_kind = 'under_review' AND current_manual <> 'under_review' THEN
      RAISE EXCEPTION 'profile is not under review';
    END IF;
  ELSIF _appeal_kind = 'rejected_verification' THEN
    IF _related_request_id IS NULL THEN
      RAISE EXCEPTION 'related verification request required';
    END IF;
    SELECT * INTO req FROM public.profile_verification_requests
      WHERE id = _related_request_id AND owner_user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'verification request not found'; END IF;
    IF req.status <> 'rejected' THEN RAISE EXCEPTION 'verification request is not rejected'; END IF;
  END IF;

  -- Prevent duplicate open appeal of same kind
  IF EXISTS (
    SELECT 1 FROM public.profile_trust_appeals
     WHERE profile_kind = _kind AND profile_id = _id
       AND appeal_kind = _appeal_kind
       AND status = 'open'
       AND (_related_request_id IS NULL OR related_request_id = _related_request_id)
  ) THEN
    RAISE EXCEPTION 'an open appeal already exists';
  END IF;

  INSERT INTO public.profile_trust_appeals
    (profile_kind, profile_id, owner_user_id, appeal_kind, related_request_id, message)
  VALUES (_kind, _id, auth.uid(), _appeal_kind, _related_request_id, _message)
  RETURNING id INTO new_id;

  INSERT INTO public.trust_audit_log
    (actor_id, action, profile_kind, profile_id, owner_user_id, reason, related_appeal_id)
  VALUES (auth.uid(), 'appeal_submitted', _kind, _id, owner, left(_message,200), new_id);

  -- Notify admins/mods
  FOR admin_user IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin','moderator')
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
    VALUES (admin_user, auth.uid(), 'trust_appeal_submitted', 'profile', _id::text,
            'A new trust appeal was submitted — review needed');
  END LOOP;

  RETURN new_id;
END $$;

-- Admin decide appeal
CREATE OR REPLACE FUNCTION public.admin_decide_trust_appeal(
  _appeal_id uuid,
  _decision text,
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE a record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _decision NOT IN ('approved','denied') THEN
    RAISE EXCEPTION 'decision must be approved or denied';
  END IF;

  SELECT * INTO a FROM public.profile_trust_appeals WHERE id = _appeal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'appeal not found'; END IF;
  IF a.status <> 'open' THEN RAISE EXCEPTION 'appeal already decided'; END IF;

  UPDATE public.profile_trust_appeals
     SET status = _decision::public.trust_appeal_status,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = _note,
         updated_at = now()
   WHERE id = _appeal_id;

  IF _decision = 'approved' THEN
    IF a.appeal_kind IN ('suspension','under_review') THEN
      PERFORM public.admin_clear_manual_trust_level(a.profile_kind, a.profile_id,
        COALESCE('appeal approved: ' || _note, 'appeal approved'));
    ELSIF a.appeal_kind = 'rejected_verification' AND a.related_request_id IS NOT NULL THEN
      UPDATE public.profile_verification_requests
         SET status = 'pending', updated_at = now(),
             admin_note = COALESCE('reopened on appeal: ' || _note, 'reopened on appeal')
       WHERE id = a.related_request_id;
    END IF;
  END IF;

  INSERT INTO public.trust_audit_log
    (actor_id, action, profile_kind, profile_id, owner_user_id, reason, related_appeal_id)
  VALUES (auth.uid(), 'appeal_' || _decision, a.profile_kind, a.profile_id, a.owner_user_id, _note, _appeal_id);

  PERFORM public.create_notification(a.owner_user_id, auth.uid(),
    'trust_appeal_' || _decision, 'profile', a.profile_id::text,
    CASE _decision
      WHEN 'approved' THEN 'Your appeal was approved' || COALESCE(': ' || _note, '')
      ELSE 'Your appeal was denied' || COALESCE(': ' || _note, '')
    END);
END $$;
