GRANT SELECT ON public.business_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_pages TO authenticated;
GRANT ALL ON public.business_pages TO service_role;