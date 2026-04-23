
-- =========================================================
-- 1. Provider subscriptions table (tracking-only, no payment)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'trial', -- trial | active | expired
  amount NUMERIC NOT NULL DEFAULT 100.00,
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own subscription"
  ON public.provider_subscriptions FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Admins view all subscriptions"
  ON public.provider_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert subscriptions"
  ON public.provider_subscriptions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update subscriptions"
  ON public.provider_subscriptions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_provider_subscriptions_updated_at
  BEFORE UPDATE ON public.provider_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create trial subscription when a provider role is assigned
CREATE OR REPLACE FUNCTION public.handle_new_provider_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role = 'provider'::app_role THEN
    INSERT INTO public.provider_subscriptions (provider_id, status)
    VALUES (NEW.user_id, 'trial')
    ON CONFLICT (provider_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_role_created ON public.user_roles;
CREATE TRIGGER on_provider_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_provider_subscription();

-- Backfill existing providers with trial subscriptions
INSERT INTO public.provider_subscriptions (provider_id, status)
SELECT user_id, 'trial' FROM public.user_roles
WHERE role = 'provider'::app_role
ON CONFLICT (provider_id) DO NOTHING;

-- =========================================================
-- 2. Chat image attachments
-- =========================================================
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.chat_messages
  ALTER COLUMN message DROP NOT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Booking participants view chat attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants upload chat attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- =========================================================
-- 3. Support tickets linked to bookings
-- =========================================================
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- =========================================================
-- 4. Remove per-order fee logic
-- =========================================================
ALTER TABLE public.bookings
  ALTER COLUMN fee SET DEFAULT 0;

UPDATE public.bookings SET fee = 0 WHERE fee <> 0;

ALTER TABLE public.services
  ALTER COLUMN price SET DEFAULT 0;

-- =========================================================
-- 5. Drop DELETE policies (preserve historical records)
-- =========================================================
DROP POLICY IF EXISTS "Admins delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete any service" ON public.services;
DROP POLICY IF EXISTS "Providers delete own services" ON public.services;
DROP POLICY IF EXISTS "Admins delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users delete own reviews" ON public.reviews;
