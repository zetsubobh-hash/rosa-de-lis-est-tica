CREATE OR REPLACE FUNCTION public.normalize_client_search(_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_catalog AS $fn$
SELECT lower(translate(btrim(regexp_replace(coalesce(_value,''),'[[:space:]]+',' ','g')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
$fn$;
REVOKE ALL ON FUNCTION public.normalize_client_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_client_search(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_admin_clients(_search text)
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path=public,pg_catalog AS $fn$
DECLARE term text := public.normalize_client_search(_search);
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.* FROM public.profiles p WHERE
 NOT EXISTS (SELECT 1 FROM unnest(string_to_array(term,' ')) AS words(word) WHERE strpos(public.normalize_client_search(p.full_name), words.word)=0)
 OR (term <> '' AND strpos(lower(coalesce(p.email,'')),term)>0)
 OR (regexp_replace(term,'[^0-9]','','g') <> '' AND term ~ '^[0-9+() .-]+$' AND strpos(regexp_replace(p.phone,'[^0-9]','','g'),regexp_replace(term,'[^0-9]','','g'))>0);
END;
$fn$;
REVOKE ALL ON FUNCTION public.search_admin_clients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_admin_clients(text) TO authenticated;

DO $test$
BEGIN
 IF public.strip_client_name_emojis('🌷 Fernanda 👩‍⚕️ Cristina ❤️') <> 'Fernanda Cristina' THEN RAISE EXCEPTION 'Emoji removal regression'; END IF;
 IF public.strip_client_name_emojis('Fabrício Almeida 123') <> 'Fabrício Almeida 123' THEN RAISE EXCEPTION 'Name preservation regression'; END IF;
 IF public.strip_client_name_emojis('Cliente 1️⃣') <> 'Cliente' THEN RAISE EXCEPTION 'Keycap removal regression'; END IF;
 IF public.normalize_client_search('  FABRÍCIO   Almeida ') <> 'fabricio almeida' THEN RAISE EXCEPTION 'Search normalization regression'; END IF;
 IF position('cleanup_stale_pending_appointments' in pg_get_functiondef('public.system_maintenance()'::regprocedure)) > 0 THEN RAISE EXCEPTION 'Maintenance must preserve appointments'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.clean_client_name_emojis()'::regprocedure) THEN RAISE EXCEPTION 'Name cleanup must respect RLS'; END IF;
END;
$test$;