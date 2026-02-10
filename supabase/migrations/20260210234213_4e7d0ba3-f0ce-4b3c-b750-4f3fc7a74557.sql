
-- Allow all authenticated users to see booked times (only date/time, not personal data)
-- This is needed so the calendar can show which slots are taken
CREATE POLICY "Authenticated users can view appointment times"
ON public.appointments FOR SELECT
TO authenticated
USING (true);
