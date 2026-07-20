
CREATE TABLE public.service_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_user_id UUID NOT NULL REFERENCES public.service_profiles(user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX service_media_service_user_id_idx ON public.service_media(service_user_id, sort_order);
CREATE UNIQUE INDEX service_media_one_cover_per_service_idx
  ON public.service_media(service_user_id) WHERE is_cover = true;

GRANT SELECT ON public.service_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_media TO authenticated;
GRANT ALL ON public.service_media TO service_role;

ALTER TABLE public.service_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_media public read"
  ON public.service_media FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "service_media owner insert"
  ON public.service_media FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = service_user_id);

CREATE POLICY "service_media owner update"
  ON public.service_media FOR UPDATE
  TO authenticated
  USING (auth.uid() = service_user_id)
  WITH CHECK (auth.uid() = service_user_id);

CREATE POLICY "service_media owner delete"
  ON public.service_media FOR DELETE
  TO authenticated
  USING (auth.uid() = service_user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER service_media_set_updated_at
  BEFORE UPDATE ON public.service_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_profiles
  ADD COLUMN IF NOT EXISTS price_display TEXT,
  ADD COLUMN IF NOT EXISTS price_min NUMERIC,
  ADD COLUMN IF NOT EXISTS price_max NUMERIC;

INSERT INTO public.service_media (service_user_id, kind, url, sort_order, is_cover)
SELECT user_id, 'photo', cover_url, 0, true
FROM public.service_profiles
WHERE cover_url IS NOT NULL
  AND cover_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.service_media m WHERE m.service_user_id = service_profiles.user_id
  );
