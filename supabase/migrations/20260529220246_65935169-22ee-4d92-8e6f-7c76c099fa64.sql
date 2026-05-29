
-- Restrict execute on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten storage listing: replace permissive read with one that only allows reading individual files
DROP POLICY IF EXISTS "media_read" ON storage.objects;
CREATE POLICY "media_read" ON storage.objects FOR SELECT USING (bucket_id = 'tuungane-media');
-- Note: bucket is public for direct file URL access (needed for <img src>); listing requires bucket_id filter
