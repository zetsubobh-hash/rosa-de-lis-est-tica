DROP FUNCTION IF EXISTS public.search_admin_clients(text);

CREATE OR REPLACE FUNCTION public.search_admin_clients(_search text, _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS SETOF public.profiles LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path=public,pg_catalog AS $fn$
DECLARE term text := public.normalize_client_search(_search);
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.* FROM public.profiles p WHERE
 (_from IS NULL OR p.created_at >= _from)
 AND (_to IS NULL OR p.created_at <= _to)
 AND (
  NOT EXISTS (SELECT 1 FROM unnest(string_to_array(term,' ')) AS words(word) WHERE strpos(public.normalize_client_search(p.full_name), words.word)=0)
  OR (term <> '' AND strpos(lower(coalesce(p.email,'')),term)>0)
  OR (regexp_replace(term,'[^0-9]','','g') <> '' AND term ~ '^[0-9+() .-]+$' AND strpos(regexp_replace(p.phone,'[^0-9]','','g'),regexp_replace(term,'[^0-9]','','g'))>0)
 );
END;
$fn$;
REVOKE ALL ON FUNCTION public.search_admin_clients(text, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_admin_clients(text, timestamptz, timestamptz) TO authenticated;