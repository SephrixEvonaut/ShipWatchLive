-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the webhook_events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id text NOT NULL,
  event_type  text NOT NULL,
  repository  text,
  branch      text,
  commit_count integer DEFAULT 0,
  payload     jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 2. Index for fast lookups by installation and time
CREATE INDEX IF NOT EXISTS idx_webhook_events_installation
  ON public.webhook_events (installation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created
  ON public.webhook_events (created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 4. Allow the service_role (webhook handler) to insert rows
--    (service_role bypasses RLS, so this is just for clarity)

-- 5. Allow authenticated users to read events linked to their installations
--    The dashboard queries with the user's session, so this policy is required.
CREATE POLICY "Users can view events for their installations"
  ON public.webhook_events
  FOR SELECT
  TO authenticated
  USING (
    installation_id IN (
      SELECT gi.installation_id::text
      FROM public.github_installations gi
      WHERE gi.user_id = auth.uid()
    )
  );

-- 6. Grant table access to the authenticated and service roles
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL    ON public.webhook_events TO service_role;
