
INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, manual_level, auto_level, updated_at, last_recomputed_at)
SELECT 'service_profile'::profile_kind, sp.user_id, sp.user_id, 'verified_provider'::trust_level, 'new'::trust_level, now(), now()
FROM public.service_profiles sp
WHERE sp.verified = 'verified'
ON CONFLICT (profile_kind, profile_id) DO UPDATE
  SET manual_level = 'verified_provider', updated_at = now();

CREATE OR REPLACE FUNCTION public.tg_sync_service_profile_verified_trust()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified = 'verified' AND (TG_OP = 'INSERT' OR OLD.verified IS DISTINCT FROM NEW.verified) THEN
    INSERT INTO public.profile_trust_status (profile_kind, profile_id, owner_user_id, manual_level, auto_level, updated_at, last_recomputed_at)
    VALUES ('service_profile', NEW.user_id, NEW.user_id, 'verified_provider', 'new', now(), now())
    ON CONFLICT (profile_kind, profile_id) DO UPDATE
      SET manual_level = 'verified_provider', updated_at = now();
  ELSIF TG_OP = 'UPDATE' AND OLD.verified = 'verified' AND NEW.verified <> 'verified' THEN
    UPDATE public.profile_trust_status
      SET manual_level = NULL, updated_at = now()
      WHERE profile_kind = 'service_profile' AND profile_id = NEW.user_id AND manual_level = 'verified_provider';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_service_profile_verified_trust ON public.service_profiles;
CREATE TRIGGER tg_service_profile_verified_trust
AFTER INSERT OR UPDATE OF verified ON public.service_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_service_profile_verified_trust();
