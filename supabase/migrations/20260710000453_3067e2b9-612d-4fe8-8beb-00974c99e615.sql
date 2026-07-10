CREATE POLICY "Public can read welcome roulette settings"
ON public.payment_settings
FOR SELECT
TO anon
USING (key IN ('welcome_roulette_enabled', 'welcome_roulette_items'));

CREATE POLICY "Authenticated can read welcome roulette settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (key IN ('welcome_roulette_enabled', 'welcome_roulette_items'));

GRANT EXECUTE ON FUNCTION public.get_public_payment_settings() TO anon, authenticated, service_role;