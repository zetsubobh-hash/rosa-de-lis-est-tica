
CREATE OR REPLACE FUNCTION public.get_booked_slots(
  p_date date,
  p_partner_id uuid DEFAULT NULL
)
RETURNS TABLE(appointment_time text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT appointment_time::text
  FROM public.appointments
  WHERE appointment_date = p_date
    AND (p_partner_id IS NULL OR partner_id = p_partner_id)
    AND status IN ('confirmed', 'pending');
$$;

REVOKE EXECUTE ON FUNCTION public.get_booked_slots(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_slots(date, uuid) TO authenticated;
