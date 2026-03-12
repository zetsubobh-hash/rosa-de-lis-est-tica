-- Add can_manage_agenda column to partners table
ALTER TABLE public.partners ADD COLUMN can_manage_agenda boolean NOT NULL DEFAULT false;

-- Allow partners with can_manage_agenda to create appointments for any client
CREATE POLICY "Partners with agenda access can insert appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);

-- Allow partners with can_manage_agenda to update any appointment
CREATE POLICY "Partners with agenda access can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);

-- Allow partners with agenda access to delete appointments
CREATE POLICY "Partners with agenda access can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);

-- Allow partners with agenda access to read all profiles (needed for scheduling)
CREATE POLICY "Partners with agenda access can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);

-- Allow partners with agenda access to manage client_plans
CREATE POLICY "Partners with agenda access can update plans"
ON public.client_plans
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);

CREATE POLICY "Partners with agenda access can insert plans"
ON public.client_plans
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM partners p 
    WHERE p.user_id = auth.uid() 
    AND p.can_manage_agenda = true
  )
);