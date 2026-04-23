
-- Fix reviews INSERT policy
DROP POLICY IF EXISTS "Clients with bookings can create reviews" ON public.reviews;
CREATE POLICY "Clients with bookings can create reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.client_id = auth.uid()
      AND bookings.service_id = reviews.service_id
      AND bookings.payment_status = 'paid'
  )
);

-- Allow admins to delete services
CREATE POLICY "Admins delete any service"
ON public.services
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete profiles
CREATE POLICY "Admins delete any profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete user_roles
CREATE POLICY "Admins delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update user_roles
CREATE POLICY "Admins update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
