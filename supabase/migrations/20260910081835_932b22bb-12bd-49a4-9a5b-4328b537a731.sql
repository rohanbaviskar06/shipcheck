ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount integer,
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS scans_razorpay_order_id_idx ON public.scans (razorpay_order_id);