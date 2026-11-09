CREATE OR REPLACE FUNCTION public.strip_client_name_prefix(_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog
AS $$ SELECT regexp_replace(_name, '^[[:space:],~.\-]+', ''); $$;
REVOKE ALL ON FUNCTION public.strip_client_name_prefix(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.strip_client_name_prefix(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clean_client_name_prefixes()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_catalog
AS $$
DECLARE changed integer; skipped integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
  RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
 END IF;
 SELECT count(*) INTO skipped FROM public.profiles
 WHERE full_name IS DISTINCT FROM public.strip_client_name_prefix(full_name)
 AND (btrim(public.strip_client_name_prefix(full_name)) = '' OR (user_id='4649913b-f48b-470e-b407-251803756157' AND auth.uid() <> user_id));
 UPDATE public.profiles SET full_name=public.strip_client_name_prefix(full_name)
 WHERE full_name IS DISTINCT FROM public.strip_client_name_prefix(full_name)
 AND btrim(public.strip_client_name_prefix(full_name)) <> ''
 AND (user_id <> '4649913b-f48b-470e-b407-251803756157' OR auth.uid()=user_id);
 GET DIAGNOSTICS changed=ROW_COUNT;
 RETURN jsonb_build_object('updated', changed, 'skipped', skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.clean_client_name_prefixes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clean_client_name_prefixes() TO authenticated, service_role;

DO $$ BEGIN
 IF public.strip_client_name_prefix('- Ana-Maria') <> 'Ana-Maria' THEN RAISE EXCEPTION 'hyphen prefix rule failed'; END IF;
 IF public.strip_client_name_prefix(', Ana, Silva') <> 'Ana, Silva' THEN RAISE EXCEPTION 'comma prefix rule failed'; END IF;
 IF public.strip_client_name_prefix('~ João~Silva') <> 'João~Silva' THEN RAISE EXCEPTION 'tilde prefix rule failed'; END IF;
 IF public.strip_client_name_prefix('. Ana S.') <> 'Ana S.' THEN RAISE EXCEPTION 'period prefix rule failed'; END IF;
 IF public.strip_client_name_prefix('  - , ~ . Fernanda Cristina') <> 'Fernanda Cristina' THEN RAISE EXCEPTION 'mixed prefix rule failed'; END IF;
 IF public.strip_client_name_prefix('Ana-Maria, Silva~ S.  ') <> 'Ana-Maria, Silva~ S.  ' THEN RAISE EXCEPTION 'unchanged name rule failed'; END IF;
 IF public.strip_client_name_prefix(' - , ~ . ') <> '' THEN RAISE EXCEPTION 'empty result rule failed'; END IF;
 IF public.strip_client_name_prefix(NULL) IS NOT NULL THEN RAISE EXCEPTION 'null rule failed'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.clean_client_name_prefixes()'::regprocedure) THEN RAISE EXCEPTION 'must be invoker'; END IF;
END $$;