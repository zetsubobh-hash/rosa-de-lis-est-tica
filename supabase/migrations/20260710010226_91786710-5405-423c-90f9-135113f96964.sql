
CREATE OR REPLACE FUNCTION public.claim_welcome_roulette(
  _code text,
  _discount_type text,
  _discount_value numeric,
  _expires_at timestamptz,
  _is_used boolean,
  _service_slug text DEFAULT NULL,
  _service_title text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _existing int;
  _coupon_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT count(*) INTO _existing FROM public.coupons
    WHERE user_id = _uid AND code LIKE 'BV-%';
  IF _existing > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.coupons (code, user_id, discount_type, discount_value, expires_at, is_used)
    VALUES (_code, _uid, _discount_type, _discount_value, _expires_at, _is_used)
    RETURNING id INTO _coupon_id;

  IF _discount_type = 'service' AND _service_slug IS NOT NULL THEN
    INSERT INTO public.client_plans (id, user_id, service_slug, service_title, plan_name, total_sessions, completed_sessions, status, created_by, notes)
    VALUES (gen_random_uuid(), _uid, _service_slug, COALESCE(_service_title, _service_slug), 'Brinde Boas-Vindas', 1, 0, 'active', 'welcome_roulette', 'Sessão grátis ganha na roleta de boas-vindas (cupom ' || _code || ')');
  END IF;

  RETURN jsonb_build_object('ok', true, 'coupon_id', _coupon_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_welcome_roulette(text, text, numeric, timestamptz, boolean, text, text) TO authenticated;
