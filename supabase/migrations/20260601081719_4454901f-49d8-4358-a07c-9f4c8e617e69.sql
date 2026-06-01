DROP POLICY IF EXISTS srsh_insert_system ON public.service_request_status_history;
REVOKE INSERT ON public.service_request_status_history FROM authenticated;