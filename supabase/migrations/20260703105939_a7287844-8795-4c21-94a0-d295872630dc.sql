-- Scope service_media to a specific public_profile so users with multiple profiles don't share media.

ALTER TABLE public.service_media
  ADD COLUMN public_profile_id uuid REFERENCES public.public_profiles(id) ON DELETE CASCADE;

-- Backfill: attach existing rows to the owner's earliest public_profile.
UPDATE public.service_media sm
SET public_profile_id = pp.id
FROM (
  SELECT DISTINCT ON (owner_id) id, owner_id
  FROM public.public_profiles
  ORDER BY owner_id, created_at ASC
) pp
WHERE pp.owner_id = sm.service_user_id
  AND sm.public_profile_id IS NULL;

-- Any orphan rows (no matching profile) get removed rather than block the NOT NULL.
DELETE FROM public.service_media WHERE public_profile_id IS NULL;

ALTER TABLE public.service_media
  ALTER COLUMN public_profile_id SET NOT NULL;

-- Replace per-owner cover uniqueness with per-profile cover uniqueness.
DROP INDEX IF EXISTS public.service_media_one_cover_per_service_idx;
CREATE UNIQUE INDEX service_media_one_cover_per_profile_idx
  ON public.service_media (public_profile_id) WHERE is_cover = true;

CREATE INDEX IF NOT EXISTS service_media_public_profile_id_idx
  ON public.service_media (public_profile_id, sort_order);
