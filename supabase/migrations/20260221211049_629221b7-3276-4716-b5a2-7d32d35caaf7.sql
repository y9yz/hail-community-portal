
-- Fix the overly permissive notifications INSERT policy
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

-- Only allow inserting notifications where sender_id matches auth.uid()
CREATE POLICY "Authenticated can insert own notifications" ON public.notifications 
FOR INSERT TO authenticated 
WITH CHECK (sender_id = auth.uid());
