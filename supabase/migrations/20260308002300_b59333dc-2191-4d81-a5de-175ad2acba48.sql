
-- Fix overly permissive insert policy
DROP POLICY "Service can insert coupons" ON public.coupons;

-- Only admins and service role can insert coupons (service role bypasses RLS)
CREATE POLICY "Admins can insert coupons" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
