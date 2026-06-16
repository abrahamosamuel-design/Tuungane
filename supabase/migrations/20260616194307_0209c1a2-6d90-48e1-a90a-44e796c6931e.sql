
-- Storage policies for verification-evidence bucket.
-- File path convention: {auth.uid()}/{request_id}/{filename}

DROP POLICY IF EXISTS ve_storage_owner_select ON storage.objects;
CREATE POLICY ve_storage_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'moderator')
    )
  );

DROP POLICY IF EXISTS ve_storage_owner_insert ON storage.objects;
CREATE POLICY ve_storage_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS ve_storage_owner_delete ON storage.objects;
CREATE POLICY ve_storage_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(),'admin')
    )
  );
