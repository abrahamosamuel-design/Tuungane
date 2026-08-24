-- Add price_unit to profile_services
ALTER TABLE public.profile_services
ADD COLUMN IF NOT EXISTS price_unit text;

-- Add direct booking tracking fields to service_requests
ALTER TABLE public.service_requests
ADD COLUMN IF NOT EXISTS quantity numeric,
ADD COLUMN IF NOT EXISTS price_total numeric;
