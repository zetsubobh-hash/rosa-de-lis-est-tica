CREATE OR REPLACE FUNCTION public.strip_client_name_emojis(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog AS $fn$
 SELECT btrim(regexp_replace(regexp_replace(regexp_replace(_name, U&'[0-9#*]\FE0F?\20E3', '', 'g'), U&'[\+01F000-\+01FAFF\2600-\27BF\200D\FE0E\FE0F\20E3\+0E0020-\+0E007F]', '', 'g'), '[[:space:]]+', ' ', 'g'));
$fn$;
REVOKE ALL ON FUNCTION public.strip_client_name_emojis(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.strip_client_name_emojis(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clean_client_name_emojis()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE changed integer; skipped integer;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO skipped FROM public.profiles WHERE full_name IS DISTINCT FROM public.strip_client_name_emojis(full_name) AND (public.strip_client_name_emojis(full_name) = '' OR (user_id='4649913b-f48b-470e-b407-251803756157' AND auth.uid() <> user_id));
 UPDATE public.profiles SET full_name=public.strip_client_name_emojis(full_name)
 WHERE full_name IS DISTINCT FROM public.strip_client_name_emojis(full_name) AND public.strip_client_name_emojis(full_name) <> '' AND (user_id <> '4649913b-f48b-470e-b407-251803756157' OR auth.uid()=user_id);
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN jsonb_build_object('updated', changed, 'skipped', skipped);
END;
$fn$;
REVOKE ALL ON FUNCTION public.clean_client_name_emojis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clean_client_name_emojis() TO authenticated;

CREATE OR REPLACE FUNCTION public.system_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $fn$
DECLARE c1 int; c2 int; c3 int; c4 int;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days'; GET DIAGNOSTICS c1=ROW_COUNT;
 DELETE FROM net._http_response WHERE created < now() - interval '2 days'; GET DIAGNOSTICS c2=ROW_COUNT;
 DELETE FROM public.page_views WHERE created_at < now() - interval '180 days'; GET DIAGNOSTICS c3=ROW_COUNT;
 SELECT public.cleanup_old_audit_logs() INTO c4;
 RETURN jsonb_build_object('cron_logs', c1, 'http_logs', c2, 'page_views', c3, 'audit_logs', c4);
END;
$fn$;
REVOKE ALL ON FUNCTION public.system_maintenance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_maintenance() TO authenticated;

UPDATE public.profiles SET full_name=public.strip_client_name_emojis(full_name)
WHERE full_name IS DISTINCT FROM public.strip_client_name_emojis(full_name)
AND public.strip_client_name_emojis(full_name) <> ''
AND user_id <> '4649913b-f48b-470e-b407-251803756157';