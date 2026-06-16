CREATE OR REPLACE FUNCTION public.create_boost(_pricing_id uuid, _entity_type text, _entity_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  boost_id uuid;
  expires timestamptz;
  existing_active uuid;
  cfg record;
  badge public.trust_level;
  kind public.profile_kind;
  pid uuid;
  is_verified boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO p FROM public.boost_pricing WHERE id = _pricing_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'pricing not found or inactive'; END IF;

  -- Enforce trust gating for profile boosts when the toggle is off.
  SELECT * INTO cfg FROM public.trust_settings WHERE id = 1;
  IF _entity_type = 'provider_profile' THEN
    kind := 'service_profile'; pid := _entity_id::uuid;
  ELSIF _entity_type = 'business_page' THEN
    kind := 'business_page'; pid := _entity_id::uuid;
  ELSE
    kind := NULL;
  END IF;

  IF kind IS NOT NULL THEN
    badge := public.get_profile_trust_badge(kind, pid);
    is_verified := badge IN ('verified_provider','verified_business','verified_organization');
    IF badge = 'suspended' THEN
      RAISE EXCEPTION 'profile_suspended';
    END IF;
    IF NOT is_verified AND COALESCE(cfg.allow_boost_unverified, true) = false THEN
      RAISE EXCEPTION 'boost_requires_verification';
    END IF;
  END IF;

  SELECT id INTO existing_active
    FROM public.boosts
   WHERE entity_type = _entity_type
     AND entity_id = _entity_id
     AND boost_type = p.boost_type
     AND status = 'active'
     AND expires_at > now()
   LIMIT 1;

  PERFORM public.spend_credits(
    auth.uid(),
    p.credits_required,
    p.boost_type,
    'Boost: ' || p.label,
    'boost_pricing',
    p.id::text
  );

  IF existing_active IS NOT NULL THEN
    UPDATE public.boosts
      SET expires_at = expires_at + make_interval(hours => p.duration_hours),
          credits_spent = credits_spent + p.credits_required,
          updated_at = now()
      WHERE id = existing_active
      RETURNING id INTO boost_id;
  ELSE
    expires := now() + make_interval(hours => p.duration_hours);
    INSERT INTO public.boosts (user_id, boost_type, entity_type, entity_id, credits_spent, starts_at, expires_at, status)
      VALUES (auth.uid(), p.boost_type, _entity_type, _entity_id, p.credits_required, now(), expires, 'active')
      RETURNING id INTO boost_id;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
    VALUES (auth.uid(), NULL, 'boost_activated', _entity_type, _entity_id,
            p.label || ' activated for ' || p.duration_hours || ' hours');

  RETURN boost_id;
END;
$function$;