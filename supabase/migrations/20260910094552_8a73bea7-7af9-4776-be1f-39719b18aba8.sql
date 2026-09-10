ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS ip_hash text;
CREATE INDEX IF NOT EXISTS scans_ip_hash_created_at_idx ON public.scans (ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS analytics_events_name_created_at_idx ON public.analytics_events (name, created_at DESC);

ALTER FUNCTION public.set_updated_at() SET search_path = public;