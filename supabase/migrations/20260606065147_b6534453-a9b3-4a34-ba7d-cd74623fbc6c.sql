-- Phase 3: Admin-managed featured locations & location expansion settings

CREATE TABLE IF NOT EXISTS public.featured_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL DEFAULT 'Uganda',
  region text,
  district text,
  town text,
  area text,
  latitude double precision,
  longitude double precision,
  category_slug text,
  priority integer NOT NULL DEFAULT 0,
  note text,
  active boolean NOT NULL DEFAULT true,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_locations TO authenticated;
GRANT ALL ON public.featured_locations TO service_role;

ALTER TABLE public.featured_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fl_read_all" ON public.featured_locations
  FOR SELECT USING (true);

CREATE POLICY "fl_write_admin" ON public.featured_locations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_fl_updated
  BEFORE UPDATE ON public.featured_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS featured_locations_active_idx
  ON public.featured_locations(active, priority DESC);

-- Seed default location expansion rules in admin_settings (only if missing).
INSERT INTO public.admin_settings (setting_key, setting_value)
SELECT 'location_expansion', jsonb_build_object(
  'default_radius_km', 10,
  'min_local_results', 3,
  'expansion_steps_km', jsonb_build_array(5, 10, 20, 50, 150),
  'default_country', 'Uganda',
  'default_district', 'Wakiso',
  'default_town', 'Entebbe'
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_settings WHERE setting_key = 'location_expansion'
);