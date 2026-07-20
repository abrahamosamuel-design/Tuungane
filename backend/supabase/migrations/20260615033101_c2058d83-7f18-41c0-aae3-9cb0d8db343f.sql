DROP POLICY IF EXISTS sr_insert_customer ON public.service_requests;
CREATE POLICY sr_insert_customer ON public.service_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id AND (provider_id IS NULL OR provider_id <> customer_id));