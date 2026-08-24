-- Alter profile_services to support being attached to a base user profile
ALTER TABLE public.profile_services
ADD COLUMN IF NOT EXISTS user_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS town text,
ADD COLUMN IF NOT EXISTS subcategory text;

-- Make profile_id nullable so a service doesn't have to belong to a business
ALTER TABLE public.profile_services ALTER COLUMN profile_id DROP NOT NULL;

-- Enforce exactly one owner type
ALTER TABLE public.profile_services
ADD CONSTRAINT profile_services_owner_check 
CHECK (
  (profile_id IS NOT NULL AND user_profile_id IS NULL) OR
  (profile_id IS NULL AND user_profile_id IS NOT NULL)
);

-- Update RLS Policies
DROP POLICY IF EXISTS ps_read_public ON public.profile_services;
CREATE POLICY ps_read_public ON public.profile_services
  FOR SELECT
  USING (
    (profile_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.public_profiles pp
      WHERE pp.id = profile_services.profile_id
        AND (pp.suspended = false
             OR pp.owner_id = auth.uid()
             OR public.has_role(auth.uid(),'admin')
             OR public.has_role(auth.uid(),'moderator'))
    ))
    OR
    (user_profile_id IS NOT NULL)
  );

DROP POLICY IF EXISTS ps_insert_owner ON public.profile_services;
CREATE POLICY ps_insert_owner ON public.profile_services
  FOR INSERT TO authenticated
  WITH CHECK (
    (profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = profile_services.profile_id AND pp.owner_id = auth.uid()))
    OR
    (user_profile_id IS NOT NULL AND user_profile_id = auth.uid())
  );

DROP POLICY IF EXISTS ps_update_owner_or_admin ON public.profile_services;
CREATE POLICY ps_update_owner_or_admin ON public.profile_services
  FOR UPDATE TO authenticated
  USING (
    (profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = profile_services.profile_id AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))))
    OR
    (user_profile_id IS NOT NULL AND (user_profile_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
  )
  WITH CHECK (
    (profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = profile_services.profile_id AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))))
    OR
    (user_profile_id IS NOT NULL AND (user_profile_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')))
  );

DROP POLICY IF EXISTS ps_delete_owner_or_admin ON public.profile_services;
CREATE POLICY ps_delete_owner_or_admin ON public.profile_services
  FOR DELETE TO authenticated
  USING (
    (profile_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = profile_services.profile_id AND (pp.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
    OR
    (user_profile_id IS NOT NULL AND (user_profile_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
