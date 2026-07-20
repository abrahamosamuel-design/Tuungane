
-- Restore table-level privileges that the Data API (PostgREST) needs.
-- Anon-readable tables (policies allow public role on SELECT)
DO $$
DECLARE
  t text;
  anon_read text[] := ARRAY[
    'boost_pricing','boosts','business_followers','business_pages',
    'credit_packages','follows','official_accounts','official_post_comments',
    'official_post_likes','official_posts','opportunities','post_comments',
    'post_likes','profiles','provider_privacy_settings','provider_recommendations',
    'reviews','service_feedback','service_profiles','timeline_posts'
  ];
  all_tables text[] := ARRAY[
    'admin_settings','boost_pricing','boosts','business_followers','business_pages',
    'contact_logs','contact_reveals','credit_packages','credit_purchase_requests',
    'credit_transactions','credit_wallets','follows','notifications',
    'official_accounts','official_post_comments','official_post_likes','official_posts',
    'opportunities','opportunity_applications','opportunity_reports','post_comments',
    'post_likes','profile_claim_requests','profiles','provider_privacy_settings',
    'provider_recommendations','provider_responses','reports','reviews',
    'saved_opportunities','saved_providers','service_disputes','service_feedback',
    'service_profiles','service_request_status_history','service_requests',
    'timeline_posts','user_roles'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
  FOREACH t IN ARRAY anon_read LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
  END LOOP;
END $$;

-- Re-apply column-level revokes on sensitive contact fields for anon
REVOKE SELECT (phone, whatsapp, email) ON public.service_profiles FROM anon;
REVOKE SELECT (email, contact_phone, whatsapp) ON public.business_pages FROM anon;
REVOKE SELECT (contact_phone, whatsapp_number, contact_email) ON public.opportunities FROM anon;
