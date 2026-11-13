-- lovable-cron-fallback-reviewed: existing jobs keep their current cadence; only auth header changes
-- Server-side welcome roulette
DROP FUNCTION IF EXISTS public.claim_welcome_roulette(text, text, numeric, timestamptz, boolean, text, text);

CREATE OR REPLACE FUNCTION public.spin_welcome_roulette()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid(); _items jsonb; _allowed boolean; _total numeric := 0; _r numeric; _acc numeric := 0;
  _it jsonb; _idx int := -1; _i int := 0; _type text; _val numeric; _days int; _code text; _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _slug text; _title text; _coupon_id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('welcome-' || _uid::text));
  SELECT coalesce(allow_welcome_roulette, false) INTO _allowed FROM profiles WHERE user_id = _uid;
  IF NOT coalesce(_allowed,false) AND EXISTS (SELECT 1 FROM coupons WHERE user_id = _uid AND code LIKE 'BV-%') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;
  SELECT value::jsonb INTO _items FROM payment_settings WHERE key = 'welcome_roulette_items';
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN RETURN jsonb_build_object('ok', false, 'error', 'not_configured'); END IF;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF coalesce((_it->>'enabled')::boolean, true) AND coalesce((_it->>'weight')::numeric,0) > 0 THEN _total := _total + (_it->>'weight')::numeric; END IF;
  END LOOP;
  IF _total <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'not_configured'); END IF;
  _r := random() * _total;
  FOR _it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF coalesce((_it->>'enabled')::boolean, true) AND coalesce((_it->>'weight')::numeric,0) > 0 THEN
      _acc := _acc + (_it->>'weight')::numeric;
      IF _r < _acc AND _idx < 0 THEN _idx := _i; EXIT; END IF;
    END IF;
    _i := _i + 1;
  END LOOP;
  IF _idx < 0 THEN _idx := _i - 1; END IF;
  _it := _items->_idx;
  _type := CASE WHEN _it->>'type' IN ('discount','service') THEN _it->>'type' ELSE 'none' END;
  _val := LEAST(100, GREATEST(0, coalesce((_it->>'value')::numeric, 0)));
  _days := GREATEST(1, LEAST(365, coalesce((_it->>'expiresDays')::int, 30)));
  _slug := nullif(_it->>'serviceSlug','');
  IF _type = 'service' AND (_slug IS NULL OR NOT EXISTS (SELECT 1 FROM services WHERE slug = _slug AND is_active)) THEN _type := 'none'; END IF;
  _code := 'BV-' || CASE _type WHEN 'none' THEN 'NADA-' WHEN 'service' THEN 'SRV-' ELSE '' END;
  FOR _i IN 1..4 LOOP _code := _code || substr(_chars, 1 + floor(random()*32)::int, 1); END LOOP;
  IF _type <> 'none' THEN _code := _code || '-'; FOR _i IN 1..4 LOOP _code := _code || substr(_chars, 1 + floor(random()*32)::int, 1); END LOOP; END IF;
  INSERT INTO coupons (code, user_id, discount_type, discount_value, expires_at, is_used)
  VALUES (_code, _uid, CASE WHEN _type='service' THEN 'service' ELSE 'percent' END, CASE WHEN _type='discount' THEN _val ELSE 0 END, now() + make_interval(days => _days), _type = 'none')
  RETURNING id INTO _coupon_id;
  IF _type = 'service' THEN
    SELECT title INTO _title FROM services WHERE slug = _slug;
    INSERT INTO client_plans (id, user_id, service_slug, service_title, plan_name, total_sessions, completed_sessions, status, created_by, notes)
    VALUES (gen_random_uuid(), _uid, _slug, coalesce(_title, _slug), 'Brinde Boas-Vindas', 1, 0, 'active', 'welcome_roulette', 'Sessão grátis ganha na roleta de boas-vindas (cupom ' || _code || ')');
  END IF;
  UPDATE profiles SET allow_welcome_roulette = false WHERE user_id = _uid AND allow_welcome_roulette;
  RETURN jsonb_build_object('ok', true, 'index', _idx, 'type', _type, 'code', _code, 'coupon_id', _coupon_id);
END $$;
REVOKE ALL ON FUNCTION public.spin_welcome_roulette() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_welcome_roulette() TO authenticated;

-- Cron secret for scheduled functions
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.cron_secret (id int PRIMARY KEY DEFAULT 1, token text NOT NULL);
REVOKE ALL ON private.cron_secret FROM PUBLIC, anon, authenticated;
INSERT INTO private.cron_secret (id, token) VALUES (1, encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT (id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.verify_cron_secret(_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT _token IS NOT NULL AND EXISTS (SELECT 1 FROM private.cron_secret WHERE token = _token);
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

SELECT cron.unschedule('appointment-reminder-cron');
SELECT cron.unschedule('birthday-check-daily');
SELECT cron.unschedule('promo-scheduler-every-minute');
SELECT cron.schedule('appointment-reminder-cron', '*/15 * * * *', $c$
  SELECT net.http_post(url:='https://sxzmtnsfsyifujdnqyzr.supabase.co/functions/v1/appointment-reminder',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT token FROM private.cron_secret WHERE id=1)), body:='{}'::jsonb);
$c$);
SELECT cron.schedule('birthday-check-daily', '0 11 * * *', $c$
  SELECT net.http_post(url:='https://sxzmtnsfsyifujdnqyzr.supabase.co/functions/v1/birthday-check',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT token FROM private.cron_secret WHERE id=1)), body:='{"source":"cron"}'::jsonb);
$c$);
SELECT cron.schedule('promo-scheduler-every-minute', '*/5 * * * *', $c$
  SELECT net.http_post(url:='https://sxzmtnsfsyifujdnqyzr.supabase.co/functions/v1/promo-scheduler',
    headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT token FROM private.cron_secret WHERE id=1)), body:='{}'::jsonb);
$c$);

-- site_settings: hide sensitive keys from the public
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Public can view non-sensitive site settings" ON public.site_settings FOR SELECT
  USING (key NOT IN ('google_api_key','vps_api_key','vps_url','audit_auto_cleanup','audit_cleanup_hours'));
CREATE POLICY "Admins can view all site settings" ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- audit_logs: users can only log entries for themselves
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(action) <= 100);

-- promo_unsubscribes: only valid phone numbers, user_id bound to caller
DROP POLICY IF EXISTS "Anyone can unsubscribe" ON public.promo_unsubscribes;
CREATE POLICY "Anyone can unsubscribe a valid phone" ON public.promo_unsubscribes FOR INSERT TO anon, authenticated
  WITH CHECK (phone ~ '^[0-9]{10,13}$' AND (user_id IS NULL OR user_id = auth.uid()));