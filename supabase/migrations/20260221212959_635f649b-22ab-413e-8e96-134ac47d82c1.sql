
-- =============================================
-- 1. New enums
-- =============================================
CREATE TYPE public.admin_status AS ENUM ('pending_admin', 'approved', 'rejected');
CREATE TYPE public.provider_booking_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid');

-- =============================================
-- 2. Services table (provider-owned, admin-approved)
-- =============================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 10.00,
  admin_status admin_status NOT NULL DEFAULT 'pending_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Permissive SELECT policies (any one = access)
CREATE POLICY "Public view approved services" ON public.services FOR SELECT USING (admin_status = 'approved');
CREATE POLICY "Providers view own services" ON public.services FOR SELECT USING (provider_id = auth.uid());
CREATE POLICY "Admins view all services" ON public.services FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers insert own services" ON public.services FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid() AND has_role(auth.uid(), 'provider'));
CREATE POLICY "Providers update own services" ON public.services FOR UPDATE TO authenticated USING (provider_id = auth.uid() AND has_role(auth.uid(), 'provider'));
CREATE POLICY "Admins update any service" ON public.services FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.services;

-- =============================================
-- 3. Fix bookings table
-- =============================================
TRUNCATE public.bookings CASCADE;
TRUNCATE public.notifications CASCADE;

-- Replace TEXT service_id with UUID FK
ALTER TABLE public.bookings DROP COLUMN service_id;
ALTER TABLE public.bookings ADD COLUMN service_id UUID NOT NULL;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id);

-- Add split status columns
ALTER TABLE public.bookings
  ADD COLUMN provider_status provider_booking_status NOT NULL DEFAULT 'pending',
  ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'unpaid';

-- Fix bookings RLS: drop old restrictive policies, create permissive ones
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Providers can update assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Providers can view assigned bookings" ON public.bookings;

CREATE POLICY "Admins view all bookings" ON public.bookings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own bookings" ON public.bookings FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "Providers view assigned bookings" ON public.bookings FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Clients create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid());
CREATE POLICY "Clients update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (client_id = auth.uid());
CREATE POLICY "Providers update assigned bookings" ON public.bookings FOR UPDATE TO authenticated USING (provider_id = auth.uid());

-- =============================================
-- 4. Fix notifications RLS (restrictive → permissive)
-- =============================================
DROP POLICY IF EXISTS "Authenticated can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Users insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- =============================================
-- 5. Fix profiles RLS (restrictive → permissive)
-- =============================================
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =============================================
-- 6. Fix user_roles RLS (restrictive → permissive)
-- =============================================
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
