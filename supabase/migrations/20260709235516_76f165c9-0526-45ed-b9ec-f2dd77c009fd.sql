CREATE OR REPLACE FUNCTION public.get_public_payment_settings()
RETURNS TABLE(key text, value text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key, value
  FROM public.payment_settings
  WHERE key IN (
    'pix_enabled', 'pix_key', 'pix_key_type', 'pix_beneficiary',
    'mercadopago_enabled', 'mercadopago_public_key',
    'welcome_roulette_enabled', 'welcome_roulette_items'
  );
$$;