
-- 1. Add order_number to bookings
CREATE SEQUENCE IF NOT EXISTS public.booking_order_number_seq START 1001;
ALTER TABLE public.bookings ADD COLUMN order_number integer NOT NULL DEFAULT nextval('public.booking_order_number_seq');

-- 2. Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = chat_messages.booking_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = chat_messages.booking_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE INDEX idx_chat_messages_booking ON public.chat_messages(booking_id, created_at);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 3. Profile edit requests table
CREATE TYPE public.edit_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.profile_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_name text,
  requested_phone text,
  status public.edit_request_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own edit requests" ON public.profile_edit_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users create own edit requests" ON public.profile_edit_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all edit requests" ON public.profile_edit_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update edit requests" ON public.profile_edit_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_profile_edit_requests_updated_at
  BEFORE UPDATE ON public.profile_edit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Also allow admins to update bookings (for status management)
CREATE POLICY "Admins update any booking" ON public.bookings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
