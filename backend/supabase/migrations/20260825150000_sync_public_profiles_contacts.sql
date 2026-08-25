-- 1. Backfill existing null emails/phones in public_profiles from auth.users
UPDATE public.public_profiles pp
SET 
  email = COALESCE(pp.email, u.email),
  phone = COALESCE(pp.phone, u.phone)
FROM auth.users u
WHERE pp.owner_id = u.id;

-- 2. Create trigger function to keep public_profiles email/phone in sync with auth.users on insert/update
CREATE OR REPLACE FUNCTION public.sync_public_profile_contacts()
RETURNS TRIGGER AS $$
BEGIN
  -- Fetch email and phone from auth.users and populate the new profile row
  SELECT email, phone INTO NEW.email, NEW.phone
  FROM auth.users
  WHERE id = NEW.owner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to public_profiles
DROP TRIGGER IF EXISTS trg_sync_public_profile_contacts ON public.public_profiles;
CREATE TRIGGER trg_sync_public_profile_contacts
  BEFORE INSERT ON public.public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_public_profile_contacts();
