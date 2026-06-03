
-- =============================================================================
-- SECURITY FIX MIGRATION
-- Fixes: partners_public_salary_phone_exposure, appointments_full_exposure,
--        coupons_unrestricted_user_update, payment_settings_authenticated_read_all
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIX PARTNERS: add TO authenticated to prevent anonymous access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read active partners" ON public.partners;
CREATE POLICY "Authenticated can read active partners"
  ON public.partners FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ---------------------------------------------------------------------------
-- 2. FIX APPOINTMENTS: create safe slot-checking function and restrict SELECT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_date date,
  p_partner_id uuid
)
RETURNS TABLE(appointment_time text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT appointment_time::text
  FROM public.appointments
  WHERE appointment_date = p_date
    AND partner_id = p_partner_id
    AND status IN ('confirmed', 'pending');
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots TO authenticated;

-- Allow partners to view all appointments (needed for dashboard/agenda)
CREATE POLICY "Partners can view all appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'partner'::app_role));

-- Drop the overly permissive authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view appointment times" ON public.appointments;

-- ---------------------------------------------------------------------------
-- 3. FIX COUPONS: create redemption function and drop dangerous policies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.coupons
  SET is_used = true, used_at = now()
  WHERE code = p_code
    AND user_id = auth.uid()
    AND is_used = false;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_coupon FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon TO authenticated;

-- Drop the broad user UPDATE policy that allows any column change
DROP POLICY IF EXISTS "Users can update own coupons" ON public.coupons;

-- Drop the dangerous authenticated INSERT policy (service_role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service can insert coupons" ON public.coupons;

-- ---------------------------------------------------------------------------
-- 4. FIX PAYMENT_SETTINGS: expose only safe keys via function, restrict table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_payment_settings()
RETURNS TABLE(key text, value text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key, value
  FROM public.payment_settings
  WHERE key IN (
    'pix_enabled', 'pix_key', 'pix_key_type', 'pix_beneficiary',
    'mercadopago_enabled', 'mercadopago_public_key'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_payment_settings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_settings TO anon, authenticated;

-- Restrict payment_settings so only admins can read directly
DROP POLICY IF EXISTS "Authenticated can read payment settings" ON public.payment_settings;

CREATE POLICY "Authenticated cannot read payment settings"
ON public.payment_settings FOR SELECT
TO authenticated
USING (false);
