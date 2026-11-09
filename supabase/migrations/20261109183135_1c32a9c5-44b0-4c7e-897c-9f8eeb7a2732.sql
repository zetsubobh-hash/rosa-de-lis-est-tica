CREATE OR REPLACE FUNCTION public.search_agenda_clients(_search text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql SECURITY INVOKER STABLE SET search_path=public,pg_catalog AS $fn$
DECLARE term text := public.normalize_client_search(_search);
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'partner')) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT p.user_id,p.full_name FROM public.profiles p WHERE NOT EXISTS (
 SELECT 1 FROM unnest(string_to_array(term,' ')) AS words(word) WHERE strpos(public.normalize_client_search(p.full_name), words.word)=0
 );
END;
$fn$;
REVOKE ALL ON FUNCTION public.search_agenda_clients(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_agenda_clients(text) TO authenticated;