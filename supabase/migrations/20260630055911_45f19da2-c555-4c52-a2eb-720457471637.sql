
-- Price Guide fields on service_profiles (per-provider default)
ALTER TABLE public.service_profiles
  ADD COLUMN IF NOT EXISTS price_type text,
  ADD COLUMN IF NOT EXISTS price_fixed_ugx integer,
  ADD COLUMN IF NOT EXISTS price_min_ugx integer,
  ADD COLUMN IF NOT EXISTS price_max_ugx integer,
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'UGX',
  ADD COLUMN IF NOT EXISTS price_note text,
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_profiles_price_type_check') THEN
    ALTER TABLE public.service_profiles
      ADD CONSTRAINT service_profiles_price_type_check
      CHECK (price_type IS NULL OR price_type IN ('fixed','starting_from','range','quote_after_inspection','negotiable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_profiles_price_amounts_nonneg') THEN
    ALTER TABLE public.service_profiles
      ADD CONSTRAINT service_profiles_price_amounts_nonneg
      CHECK (
        (price_fixed_ugx IS NULL OR price_fixed_ugx >= 0) AND
        (price_min_ugx   IS NULL OR price_min_ugx   >= 0) AND
        (price_max_ugx   IS NULL OR price_max_ugx   >= 0)
      );
  END IF;
END $$;

-- Validation + auto-stamp price_updated_at via trigger (avoids time-dependent CHECKs)
CREATE OR REPLACE FUNCTION public._tg_validate_price_guide()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.price_type IS NOT NULL THEN
    IF NEW.price_type = 'fixed' AND NEW.price_fixed_ugx IS NULL THEN
      RAISE EXCEPTION 'Please enter your fixed price.';
    ELSIF NEW.price_type = 'starting_from' AND NEW.price_min_ugx IS NULL THEN
      RAISE EXCEPTION 'Please enter a starting price.';
    ELSIF NEW.price_type = 'range' THEN
      IF NEW.price_min_ugx IS NULL OR NEW.price_max_ugx IS NULL THEN
        RAISE EXCEPTION 'Please enter both minimum and maximum price.';
      ELSIF NEW.price_max_ugx <= NEW.price_min_ugx THEN
        RAISE EXCEPTION 'Maximum price should be higher than minimum price.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.price_type IS DISTINCT FROM OLD.price_type
     OR NEW.price_fixed_ugx IS DISTINCT FROM OLD.price_fixed_ugx
     OR NEW.price_min_ugx IS DISTINCT FROM OLD.price_min_ugx
     OR NEW.price_max_ugx IS DISTINCT FROM OLD.price_max_ugx
     OR NEW.price_note IS DISTINCT FROM OLD.price_note THEN
    NEW.price_updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_validate_price_guide_sp ON public.service_profiles;
CREATE TRIGGER tg_validate_price_guide_sp
  BEFORE INSERT OR UPDATE ON public.service_profiles
  FOR EACH ROW EXECUTE FUNCTION public._tg_validate_price_guide();

-- Per-service price guide (multi-service support)
ALTER TABLE public.profile_services
  ADD COLUMN IF NOT EXISTS price_type text,
  ADD COLUMN IF NOT EXISTS price_fixed_ugx integer,
  ADD COLUMN IF NOT EXISTS price_min_ugx integer,
  ADD COLUMN IF NOT EXISTS price_max_ugx integer,
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'UGX',
  ADD COLUMN IF NOT EXISTS price_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_services_price_type_check') THEN
    ALTER TABLE public.profile_services
      ADD CONSTRAINT profile_services_price_type_check
      CHECK (price_type IS NULL OR price_type IN ('fixed','starting_from','range','quote_after_inspection','negotiable'));
  END IF;
END $$;
