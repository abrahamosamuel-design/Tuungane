
-- Fix 1: profiles table - restrict reads to authenticated users only
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;

CREATE POLICY profiles_read_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM anon;

-- Fix 2: realtime.messages - restrict broadcast/presence subscriptions to topics scoped to the authenticated user
-- Note: postgres_changes subscriptions remain governed by RLS on the underlying public tables.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_access_own_topics" ON realtime.messages;

CREATE POLICY "authenticated_can_access_own_topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
  );
