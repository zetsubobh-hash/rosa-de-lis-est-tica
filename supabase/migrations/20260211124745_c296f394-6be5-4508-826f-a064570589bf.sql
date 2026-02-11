
-- Drop overly permissive partner policies and make them more specific
DROP POLICY IF EXISTS "Partners can view related plans" ON public.client_plans;
DROP POLICY IF EXISTS "Partners can update session progress" ON public.client_plans;

-- Partners can only view plans for users they have appointments with
CREATE POLICY "Partners can view related plans"
  ON public.client_plans FOR SELECT
  USING (
    has_role(auth.uid(), 'partner'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.partners p ON p.id = a.partner_id
      WHERE p.user_id = auth.uid()
        AND a.user_id = client_plans.user_id
        AND a.service_slug = client_plans.service_slug
    )
  );

-- Partners can only update session progress for their assigned clients
CREATE POLICY "Partners can update session progress"
  ON public.client_plans FOR UPDATE
  USING (
    has_role(auth.uid(), 'partner'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.partners p ON p.id = a.partner_id
      WHERE p.user_id = auth.uid()
        AND a.user_id = client_plans.user_id
        AND a.service_slug = client_plans.service_slug
    )
  );
