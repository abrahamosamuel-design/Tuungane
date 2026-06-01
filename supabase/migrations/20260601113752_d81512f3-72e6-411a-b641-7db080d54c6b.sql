-- Section 13: Lock down SECURITY DEFINER function execution.
-- Trigger functions are invoked by Postgres itself and don't need PUBLIC EXECUTE.
-- User-facing RPCs keep EXECUTE only for the authenticated role.

-- 1) Revoke broad EXECUTE from PUBLIC on all SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.notify_on_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_recommendation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_purchase_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_provider_response() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_service_feedback() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_service_request_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_starter_credits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_boost(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.matching_requests_for_provider(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_expire_boost(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) FROM PUBLIC, anon;

-- 2) Grant EXECUTE to authenticated only where the function is meant to be called
-- from the app. Each of these performs internal authorization checks.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_boost(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matching_requests_for_provider(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deduct_credits(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_expire_boost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_purchase_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 3) Restrict listing of the public media bucket. Anonymous users can still
-- fetch files by direct URL (bucket is public), but they can no longer
-- enumerate the contents of other users' folders.
DROP POLICY IF EXISTS "Public read tuungane-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tuungane-media" ON storage.objects;
DROP POLICY IF EXISTS "tuungane-media public select" ON storage.objects;

CREATE POLICY "tuungane_media_owner_or_admin_list"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tuungane-media' AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);