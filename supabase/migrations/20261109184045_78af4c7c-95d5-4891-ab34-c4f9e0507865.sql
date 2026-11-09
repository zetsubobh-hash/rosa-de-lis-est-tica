CREATE OR REPLACE FUNCTION public.agenda_phone_matches(_phone text, _search text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog AS $fn$
 SELECT coalesce(_search ~ '^[[:space:]0-9()+.-]+$' AND length(regexp_replace(_search, '[^0-9]', '', 'g')) > 0 AND strpos(regexp_replace(coalesce(_phone, ''), '[^0-9]', '', 'g'), regexp_replace(_search, '[^0-9]', '', 'g')) > 0, false);
$fn$;
REVOKE ALL ON FUNCTION public.agenda_phone_matches(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agenda_phone_matches(text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_agenda_clients(_search text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public, pg_catalog AS $fn$
DECLARE term text := public.normalize_client_search(_search); is_admin boolean := public.has_role(auth.uid(),'admin');
BEGIN
 IF auth.uid() IS NULL OR NOT (is_admin OR public.has_role(auth.uid(),'partner')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.user_id,p.full_name FROM public.profiles p WHERE
 NOT EXISTS (SELECT 1 FROM unnest(string_to_array(term,' ')) AS words(word) WHERE strpos(public.normalize_client_search(p.full_name), words.word)=0)
 OR (is_admin AND public.agenda_phone_matches(p.phone, _search));
END;
$fn$;
REVOKE ALL ON FUNCTION public.search_agenda_clients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_agenda_clients(text) TO authenticated;

DO $test$
BEGIN
 IF NOT public.agenda_phone_matches('+55 (31) 99999-1234', '(31) 99999-1234') THEN RAISE EXCEPTION 'Formatted telephone must match'; END IF;
 IF NOT public.agenda_phone_matches('(31) 99999-1234', '999991234') THEN RAISE EXCEPTION 'Unformatted telephone must match'; END IF;
 IF NOT public.agenda_phone_matches('(31) 99999-1234', '1234') THEN RAISE EXCEPTION 'Partial telephone must match'; END IF;
 IF public.agenda_phone_matches('(31) 99999-1234', '') OR public.agenda_phone_matches('(31) 99999-1234', '() -') OR public.agenda_phone_matches(NULL, '1234') OR public.agenda_phone_matches('(31) 99999-1234', 'Fernanda') OR public.agenda_phone_matches('(31) 99999-1234', '8888') THEN RAISE EXCEPTION 'Empty, names, missing and unrelated phones must not match'; END IF;
END;
$test$;