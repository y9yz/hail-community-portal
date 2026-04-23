
-- Add location columns to services
ALTER TABLE public.services
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric,
ADD COLUMN address_name text;

-- Create reviews table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (service_id, client_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
USING (true);

-- Only clients with a booking for the service can insert reviews
CREATE POLICY "Clients with bookings can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.client_id = auth.uid()
    AND bookings.service_id = reviews.service_id
    AND bookings.status IN ('accepted', 'paid')
  )
);

-- Users can update own reviews
CREATE POLICY "Users update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (client_id = auth.uid());

-- Users can delete own reviews
CREATE POLICY "Users delete own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (client_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
