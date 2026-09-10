CREATE TABLE public.scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  score integer NOT NULL,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.scans TO anon;
GRANT SELECT, INSERT ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view a scan by link"
ON public.scans FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create a scan"
ON public.scans FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE INDEX scans_created_at_idx ON public.scans (created_at DESC);