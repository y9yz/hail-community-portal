-- Fix: Allow providers to read and update their own subscription
-- This fixes the "Could not find table" error and infinite redirect loop

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins insert subscriptions" ON public.provider_subscriptions;
DROP POLICY IF EXISTS "Admins update subscriptions" ON public.provider_subscriptions;

-- New policies that allow providers to manage their own subscription
CREATE POLICY "Providers insert own subscription"
  ON public.provider_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid() AND has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers update own subscription"
  ON public.provider_subscriptions FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid() AND has_role(auth.uid(), 'provider'::app_role))
  WITH CHECK (provider_id = auth.uid() AND has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Admins insert any subscription"
  ON public.provider_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update any subscription"
  ON public.provider_subscriptions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
