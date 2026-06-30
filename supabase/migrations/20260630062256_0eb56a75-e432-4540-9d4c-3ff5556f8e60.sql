
-- Add primary service support to profile_services
ALTER TABLE public.profile_services
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Only one primary service per profile
CREATE UNIQUE INDEX IF NOT EXISTS profile_services_one_primary_per_profile
  ON public.profile_services (profile_id)
  WHERE is_primary = true;

-- Trigger: keep only one primary per profile; auto-promote first service if none primary
CREATE OR REPLACE FUNCTION public._tg_profile_services_primary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If marked primary, unset other primaries
    IF NEW.is_primary THEN
      UPDATE public.profile_services
        SET is_primary = false
        WHERE profile_id = NEW.profile_id AND id <> NEW.id AND is_primary = true;
    ELSE
      -- If no primary exists for this profile, make this one primary
      IF NOT EXISTS (
        SELECT 1 FROM public.profile_services
        WHERE profile_id = NEW.profile_id AND is_primary = true
      ) THEN
        NEW.is_primary := true;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_primary AND NOT OLD.is_primary THEN
      UPDATE public.profile_services
        SET is_primary = false
        WHERE profile_id = NEW.profile_id AND id <> NEW.id AND is_primary = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_profile_services_primary ON public.profile_services;
CREATE TRIGGER tg_profile_services_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.profile_services
  FOR EACH ROW EXECUTE FUNCTION public._tg_profile_services_primary();

-- Backfill: pick the lowest sort_order active service as primary per profile
WITH ranked AS (
  SELECT id, profile_id,
    ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY active DESC, sort_order, created_at) AS rn
  FROM public.profile_services
)
UPDATE public.profile_services ps
  SET is_primary = true
  FROM ranked r
  WHERE ps.id = r.id
    AND r.rn = 1
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_services p2
      WHERE p2.profile_id = ps.profile_id AND p2.is_primary = true
    );
