CREATE OR REPLACE FUNCTION public.claim_loyalty_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _done int; _claimed int; _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('loyalty-' || _uid::text));
  SELECT count(*) INTO _done FROM appointments WHERE user_id = _uid AND status = 'completed';
  SELECT count(*) INTO _claimed FROM coupons WHERE user_id = _uid AND code LIKE 'FID-%';
  IF _done < (_claimed + 1) * 10 THEN
    RETURN jsonb_build_object('ok', false, 'completed', _done, 'claimed', _claimed);
  END IF;
  _code := 'FID-' || upper(substr(md5(random()::text || _uid::text), 1, 6));
  INSERT INTO coupons (code, user_id, discount_type, discount_value, expires_at)
  VALUES (_code, _uid, 'percent', 15, now() + interval '60 days');
  RETURN jsonb_build_object('ok', true, 'code', _code);
END $$;
REVOKE ALL ON FUNCTION public.claim_loyalty_reward() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_loyalty_reward() TO authenticated;