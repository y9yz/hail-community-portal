
CREATE POLICY "Providers delete own services" ON public.services
  FOR DELETE TO authenticated
  USING ((provider_id = auth.uid()) AND public.has_role(auth.uid(), 'provider'));
