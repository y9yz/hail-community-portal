DROP POLICY IF EXISTS "Clients with bookings can create reviews" ON public.reviews;

CREATE POLICY "Clients with completed bookings can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.client_id = auth.uid()
      AND bookings.service_id = reviews.service_id
      AND bookings.status = 'completed'::booking_status
  )
);