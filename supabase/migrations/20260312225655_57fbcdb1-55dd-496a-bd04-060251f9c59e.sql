-- Relax partner insert checks to rely on partner permission flags directly,
-- avoiding false negatives when user_roles mapping is temporarily inconsistent.
ALTER POLICY "Partners with create permission can insert plans"
ON public.client_plans
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.user_id = auth.uid()
      AND p.is_active = true
      AND p.can_create_appointments = true
  )
);

ALTER POLICY "Partners with permissions can insert appointments"
ON public.appointments
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.user_id = auth.uid()
      AND p.is_active = true
      AND p.can_create_appointments = true
  )
);