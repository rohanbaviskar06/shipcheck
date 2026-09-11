ALTER TABLE public.scans ADD COLUMN IF NOT EXISTS previous_scan_id uuid REFERENCES public.scans(id);
CREATE INDEX IF NOT EXISTS scans_previous_scan_id_idx ON public.scans (previous_scan_id);
