
-- contact_logs
CREATE TABLE public.contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  service_request_id uuid NOT NULL,
  service_job_id uuid,
  contact_method text NOT NULL CHECK (contact_method IN ('whatsapp','call','in_app')),
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_logs_customer ON public.contact_logs(customer_id);
CREATE INDEX idx_contact_logs_provider ON public.contact_logs(provider_id);
CREATE INDEX idx_contact_logs_request ON public.contact_logs(service_request_id);

GRANT SELECT, INSERT ON public.contact_logs TO authenticated;
GRANT ALL ON public.contact_logs TO service_role;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY cl_insert_customer ON public.contact_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = service_request_id
        AND r.customer_id = auth.uid()
        AND r.provider_id = contact_logs.provider_id
    )
  );

CREATE POLICY cl_read_parties ON public.contact_logs
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- contact_reveals
CREATE TABLE public.contact_reveals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  service_request_id uuid NOT NULL,
  revealed_phone text,
  revealed_whatsapp text,
  reveal_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_reveals_request ON public.contact_reveals(service_request_id);

GRANT SELECT, INSERT ON public.contact_reveals TO authenticated;
GRANT ALL ON public.contact_reveals TO service_role;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY cr_insert_customer ON public.contact_reveals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM public.service_requests r
      WHERE r.id = service_request_id
        AND r.customer_id = auth.uid()
        AND r.provider_id = contact_reveals.provider_id
    )
  );

CREATE POLICY cr_read_parties ON public.contact_reveals
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = provider_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- provider_privacy_settings
CREATE TABLE public.provider_privacy_settings (
  user_id uuid PRIMARY KEY,
  contact_reveal_policy text NOT NULL DEFAULT 'after_request'
    CHECK (contact_reveal_policy IN ('after_request','after_accept','after_selected','in_app_first')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_privacy_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.provider_privacy_settings TO authenticated;
GRANT ALL ON public.provider_privacy_settings TO service_role;
ALTER TABLE public.provider_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pps_read_all ON public.provider_privacy_settings FOR SELECT USING (true);
CREATE POLICY pps_insert_own ON public.provider_privacy_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pps_update_own_or_admin ON public.provider_privacy_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- helper RPC
CREATE OR REPLACE FUNCTION public.can_reveal_contact(_customer uuid, _provider uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_requests r
    LEFT JOIN public.provider_privacy_settings p ON p.user_id = _provider
    WHERE r.customer_id = _customer
      AND r.provider_id = _provider
      AND r.status IN ('requested','accepted','in_progress','completed')
      AND (
        COALESCE(p.contact_reveal_policy,'after_request') = 'after_request'
        OR (COALESCE(p.contact_reveal_policy,'after_request') = 'after_accept'
            AND r.status IN ('accepted','in_progress','completed'))
        OR (COALESCE(p.contact_reveal_policy,'after_request') = 'after_selected'
            AND r.selected_provider_id = _provider)
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_reveal_contact(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_reveal_contact(uuid,uuid) TO authenticated, service_role;

-- seed admin contact_visibility settings (idempotent)
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('contact_visibility', jsonb_build_object(
  'hide_phone_before_request', true,
  'hide_whatsapp_before_request', true,
  'require_request_before_reveal', true,
  'allow_whatsapp_after_request', true,
  'allow_call_after_request', true,
  'only_after_selection_for_open_requests', true
))
ON CONFLICT (setting_key) DO NOTHING;
