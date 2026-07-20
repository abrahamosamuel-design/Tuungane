ALTER TABLE public.provider_responses
  ADD COLUMN IF NOT EXISTS contact_preference TEXT
    CHECK (contact_preference IN ('in_app','phone','whatsapp','any'));