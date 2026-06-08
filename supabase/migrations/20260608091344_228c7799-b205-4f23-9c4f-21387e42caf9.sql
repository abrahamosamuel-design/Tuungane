DROP POLICY IF EXISTS pps_read_all ON public.provider_privacy_settings;
CREATE POLICY pps_read_authenticated ON public.provider_privacy_settings
  FOR SELECT TO authenticated USING (true);