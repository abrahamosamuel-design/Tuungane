
-- Table: verification_evidence
DROP POLICY IF EXISTS ve_insert_owner ON public.verification_evidence;
DROP POLICY IF EXISTS ve_delete_owner ON public.verification_evidence;
DROP POLICY IF EXISTS ve_delete_staff ON public.verification_evidence;
DROP POLICY IF EXISTS ve_update_none ON public.verification_evidence;

CREATE POLICY ve_insert_owner_pending
  ON public.verification_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profile_verification_requests r
       WHERE r.id = request_id
         AND r.owner_user_id = auth.uid()
         AND r.status IN ('pending','more_info')
    )
  );

CREATE POLICY ve_delete_staff
  ON public.verification_evidence
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- No UPDATE policy = updates blocked.

-- Storage bucket: verification-evidence
DROP POLICY IF EXISTS ve_storage_owner_delete ON storage.objects;
DROP POLICY IF EXISTS ve_storage_owner_update ON storage.objects;
DROP POLICY IF EXISTS ve_storage_staff_delete ON storage.objects;

CREATE POLICY ve_storage_staff_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  );

-- No UPDATE policy on the bucket = updates blocked.
