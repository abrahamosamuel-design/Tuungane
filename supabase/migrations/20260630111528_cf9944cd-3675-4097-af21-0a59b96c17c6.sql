
CREATE OR REPLACE FUNCTION public.sync_is_provider_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_any boolean;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  SELECT
    EXISTS (SELECT 1 FROM public.service_profiles WHERE user_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.public_profiles WHERE owner_id = p_user_id)
  INTO has_any;

  UPDATE public.profiles
  SET is_provider = has_any
  WHERE id = p_user_id
    AND is_provider IS DISTINCT FROM has_any;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_is_provider_sp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_is_provider_for_user(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.sync_is_provider_for_user(NEW.user_id);
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM public.sync_is_provider_for_user(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_is_provider_pp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_is_provider_for_user(OLD.owner_id);
    RETURN OLD;
  END IF;
  PERFORM public.sync_is_provider_for_user(NEW.owner_id);
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    PERFORM public.sync_is_provider_for_user(OLD.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_is_provider_on_service_profiles ON public.service_profiles;
CREATE TRIGGER sync_is_provider_on_service_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.service_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_is_provider_sp();

DROP TRIGGER IF EXISTS sync_is_provider_on_public_profiles ON public.public_profiles;
CREATE TRIGGER sync_is_provider_on_public_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.public_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_is_provider_pp();

-- Backfill
WITH derived AS (
  SELECT p.id,
    (EXISTS (SELECT 1 FROM public.service_profiles sp WHERE sp.user_id = p.id)
     OR EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.owner_id = p.id)) AS should_be
  FROM public.profiles p
)
UPDATE public.profiles p
SET is_provider = d.should_be
FROM derived d
WHERE p.id = d.id AND p.is_provider IS DISTINCT FROM d.should_be;
