-- =========================================================
-- TUUNGANE — FULL DATABASE DATA WIPE
-- =========================================================
-- WARNING: This script permanently deletes ALL data from
-- every table in the public schema AND all users from
-- auth.users. This action is IRREVERSIBLE.
--
-- Run via: Supabase SQL Editor (Dashboard → SQL Editor)
-- Required role: service_role / superuser
-- =========================================================

BEGIN;

-- =========================================================
-- 1. TRUNCATE ALL PUBLIC SCHEMA TABLES
-- =========================================================
-- Using TRUNCATE ... CASCADE to automatically handle
-- foreign key dependencies between tables.
-- This is faster and cleaner than DELETE for a full wipe.

TRUNCATE TABLE

  -- Trust & Verification system
  public.trust_audit_log,
  public.trust_settings,
  public.profile_admin_notes,
  public.profile_reports,
  public.verification_evidence,
  public.profile_verification_requests,
  public.profile_trust_status,
  public.profile_trust_appeals,

  -- Notifications & Push
  public.notification_push_prefs,
  public.notification_push_subscriptions,
  public.push_config,
  public.notifications,

  -- Messaging
  public.messages,
  public.conversations,
  public.user_blocks,

  -- Service Requests & Feedback
  public.service_disputes,
  public.service_feedback,
  public.service_request_status_history,
  public.service_requests,
  public.provider_responses,

  -- Credits, Boosts & Billing
  public.boosts,
  public.boost_pricing,
  public.credit_purchase_requests,
  public.credit_transactions,
  public.credit_wallets,
  public.credit_packages,
  public.admin_settings,

  -- Business Pages
  public.business_followers,
  public.business_pages,

  -- Contact & Privacy
  public.contact_reveals,
  public.contact_logs,
  public.provider_privacy_settings,

  -- Official Accounts & Posts
  public.profile_claim_requests,
  public.official_post_comments,
  public.official_post_likes,
  public.official_posts,
  public.official_accounts,

  -- Service Categories & Media
  public.service_media,
  public.service_subcategories,
  public.service_categories,
  public.profile_services,
  public.featured_locations,

  -- Public Profiles (materialized/cached)
  public.public_profiles,

  -- Admin Activity Log
  public.admin_activity_log,

  -- Timeline Posts & Engagement
  public.post_comments,
  public.post_likes,
  public.timeline_posts,

  -- Reviews & Recommendations
  public.reviews,
  public.provider_recommendations,

  -- Social
  public.saved_providers,
  public.follows,

  -- Reports
  public.reports,

  -- Core Profiles & Roles
  public.service_profiles,
  public.user_roles,
  public.profiles

CASCADE;

-- =========================================================
-- 2. DELETE ALL AUTH USERS
-- =========================================================
-- Supabase doesn't allow TRUNCATE on auth schema tables,
-- so we use DELETE instead. This also cascade-deletes any
-- remaining references due to FK ON DELETE CASCADE.

DELETE FROM auth.users;

-- =========================================================
-- 3. CLEAR STORAGE OBJECTS (optional but recommended)
-- =========================================================
-- Remove all uploaded media files from the tuungane-media bucket.

DELETE FROM storage.objects WHERE bucket_id = 'tuungane-media';

COMMIT;

-- =========================================================
-- VERIFICATION: Run these queries to confirm the wipe
-- =========================================================
-- SELECT COUNT(*) FROM auth.users;
-- SELECT COUNT(*) FROM public.profiles;
-- SELECT COUNT(*) FROM public.service_profiles;
-- SELECT COUNT(*) FROM public.timeline_posts;
-- SELECT COUNT(*) FROM public.notifications;
-- SELECT COUNT(*) FROM public.messages;
-- SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'tuungane-media';
