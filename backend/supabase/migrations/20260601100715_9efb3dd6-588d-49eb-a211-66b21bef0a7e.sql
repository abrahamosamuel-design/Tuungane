-- Create RPC to atomically spend credits and create a boost
CREATE OR REPLACE FUNCTION public.create_boost(
  _pricing_id uuid,
  _entity_type text,
  _entity_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  boost_id uuid;
  expires timestamptz;
  existing_active uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO p FROM public.boost_pricing WHERE id = _pricing_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'pricing not found or inactive'; END IF;

  -- Prevent duplicate active boost of same type on same entity (extends instead)
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
    'boost_spend',
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
$$;

-- Allow callers to invoke
GRANT EXECUTE ON FUNCTION public.create_boost(uuid, text, text) TO authenticated;

-- Admin RPC to expire a boost early (refund optional, not implemented here)
CREATE OR REPLACE FUNCTION public.admin_expire_boost(_boost_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.boosts SET status = 'expired', expires_at = now(), updated_at = now()
    WHERE id = _boost_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_expire_boost(uuid) TO authenticated;

-- Helpful index for active-boost lookups
CREATE INDEX IF NOT EXISTS idx_boosts_lookup ON public.boosts (entity_type, entity_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON public.boosts (user_id, status);