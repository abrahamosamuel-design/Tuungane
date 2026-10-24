-- =========================================================
-- Migration: Drop legacy business_pages & business_followers
-- Reason: All business listings have been unified under public.profile_services
-- =========================================================

-- 1. Drop dependent tables
DROP TABLE IF EXISTS public.business_followers CASCADE;

-- 2. Drop legacy business_pages table
DROP TABLE IF EXISTS public.business_pages CASCADE;

-- 3. Clean up legacy business_page_id foreign key columns if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'timeline_posts' 
          AND column_name = 'business_page_id'
    ) THEN
        ALTER TABLE public.timeline_posts DROP COLUMN business_page_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'opportunities' 
          AND column_name = 'business_page_id'
    ) THEN
        ALTER TABLE public.opportunities DROP COLUMN business_page_id;
    END IF;
END $$;
