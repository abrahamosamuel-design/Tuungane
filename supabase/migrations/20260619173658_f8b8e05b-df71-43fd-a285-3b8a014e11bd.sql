
CREATE OR REPLACE FUNCTION public.get_profile_trust_checklist(_kind profile_kind, _id uuid)
RETURNS TABLE(key text, label text, done boolean, unlocks text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner uuid;
  cfg record;
  phone_ok boolean := false;
  jobs_count integer := 0;
  review_count integer := 0;
BEGIN
  owner := public._trust_profile_owner(_kind, _id);
  IF owner IS NULL THEN RAISE EXCEPTION 'profile not found'; END IF;

  -- Owner or admin/mod only
  IF auth.uid() IS NULL
     OR (auth.uid() <> owner
         AND NOT public.has_role(auth.uid(), 'admin')
         AND NOT public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO cfg FROM public.trust_settings WHERE id = 1;
  SELECT (phone_confirmed_at IS NOT NULL) INTO phone_ok FROM auth.users WHERE id = owner;
  phone_ok := COALESCE(phone_ok, false);

  IF _kind = 'service_profile' THEN
    SELECT count(*) INTO jobs_count FROM public.service_requests
      WHERE provider_id = owner AND status = 'completed';
    SELECT count(*) INTO review_count FROM public.reviews
      WHERE provider_user_id = owner AND hidden = false;

    RETURN QUERY
    WITH sp AS (SELECT * FROM public.service_profiles WHERE user_id = _id),
         pp AS (SELECT avatar_url FROM public.profiles WHERE id = owner)
    SELECT * FROM (VALUES
      ('phone',    'Verify your phone number',
        phone_ok, 'Phone Verified'),
      ('photo',    'Add a profile photo or cover image',
        (SELECT (sp.cover_url IS NOT NULL OR pp.avatar_url IS NOT NULL) FROM sp, pp),
        'Profile Complete'),
      ('category', 'Pick a service category',
        (SELECT sp.category_slug IS NOT NULL AND sp.category_slug <> '' FROM sp),
        'Profile Complete'),
      ('location', 'Set your district or town',
        (SELECT sp.district <> '' OR sp.town <> '' FROM sp),
        'Profile Complete'),
      ('bio',      'Write a short bio',
        (SELECT sp.bio <> '' FROM sp),
        'Profile Complete'),
      ('contact',  'Add a phone, WhatsApp, or email',
        (SELECT COALESCE(sp.phone, sp.whatsapp, sp.email) IS NOT NULL FROM sp),
        'Profile Complete'),
      ('services', 'List at least one active service',
        EXISTS (SELECT 1 FROM public.profile_services ps
                JOIN public.public_profiles pp2 ON pp2.id = ps.profile_id
                WHERE pp2.owner_id = owner AND ps.active = true),
        'Profile Complete'),
      ('jobs_done', 'Complete ' || cfg.min_completed_jobs_for_reviewed || ' service request(s) on Tuungane',
        jobs_count >= cfg.min_completed_jobs_for_reviewed,
        'Reviewed Provider'),
      ('reviews',   'Receive ' || cfg.min_verified_reviews_for_reviewed || ' verified review(s)',
        review_count >= cfg.min_verified_reviews_for_reviewed,
        'Reviewed Provider')
    ) AS t(key, label, done, unlocks);

  ELSIF _kind = 'business_page' THEN
    RETURN QUERY
    WITH bp AS (SELECT * FROM public.business_pages WHERE id = _id)
    SELECT * FROM (VALUES
      ('phone',    'Verify your phone number',
        phone_ok, 'Phone Verified'),
      ('logo',     'Upload a logo',
        (SELECT bp.logo_url IS NOT NULL FROM bp),
        'Profile Complete'),
      ('category', 'Pick a category',
        (SELECT bp.category_slug IS NOT NULL AND bp.category_slug <> '' FROM bp),
        'Profile Complete'),
      ('location', 'Set district or town',
        (SELECT COALESCE(bp.district,'') <> '' OR COALESCE(bp.town,'') <> '' FROM bp),
        'Profile Complete'),
      ('description', 'Write a description',
        (SELECT COALESCE(bp.description,'') <> '' FROM bp),
        'Profile Complete'),
      ('services', 'Add at least one service',
        (SELECT COALESCE(array_length(bp.services,1),0) >= 1 FROM bp),
        'Profile Complete'),
      ('contact',  'Add a phone, WhatsApp, or email',
        (SELECT COALESCE(bp.contact_phone, bp.whatsapp, bp.email) IS NOT NULL FROM bp),
        'Profile Complete')
    ) AS t(key, label, done, unlocks);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.get_profile_trust_checklist(profile_kind, uuid) TO authenticated;
