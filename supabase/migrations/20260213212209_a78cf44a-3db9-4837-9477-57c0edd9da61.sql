
-- Drop the existing ALL policy for admins and the user update policy
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;

-- Recreate admin ALL policy with TO authenticated
CREATE POLICY "Admins can manage all appointments"
ON public.appointments
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Recreate user update policy with TO authenticated
CREATE POLICY "Users can update own appointments"
ON public.appointments
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
