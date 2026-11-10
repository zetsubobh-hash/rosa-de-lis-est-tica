CREATE OR REPLACE FUNCTION public.default_partner_on_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _partner_id uuid;
BEGIN
  IF NEW.partner_id IS NULL THEN
    SELECT id INTO _partner_id
    FROM public.partners
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
    IF _partner_id IS NOT NULL THEN
      NEW.partner_id := _partner_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_default_partner_on_appointment ON public.appointments;
CREATE TRIGGER set_default_partner_on_appointment
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.default_partner_on_appointment();