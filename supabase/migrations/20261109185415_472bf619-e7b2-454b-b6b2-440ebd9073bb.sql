CREATE OR REPLACE FUNCTION public.normalize_client_search(_value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO public, pg_catalog
AS $$
 SELECT lower(translate(
 regexp_replace(btrim(regexp_replace(regexp_replace(normalize(coalesce(_value,''), NFKD), U&'[\0300-\036F]', '', 'g'), '[[:space:]]+', ' ', 'g')), '^[[:space:],~.\-]+', ''),
 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
$$;
DO $$
DECLARE before_profile jsonb; before_appointments jsonb;
BEGIN
 IF public.normalize_client_search('𝑴𝒊𝒎𝒊') <> 'mimi' THEN RAISE EXCEPTION 'styled Mimi search failed'; END IF;
 IF public.normalize_client_search('-Mimi') <> 'mimi' THEN RAISE EXCEPTION 'old prefix search failed'; END IF;
 IF public.normalize_client_search('  - , ~ . Fernanda   Cristina') <> 'fernanda cristina' THEN RAISE EXCEPTION 'whitespace search failed'; END IF;
 IF public.normalize_client_search('Fabrício') <> 'fabricio' THEN RAISE EXCEPTION 'accent search failed'; END IF;
 IF public.strip_client_name_prefix('-𝑴𝒊𝒎𝒊') <> '𝑴𝒊𝒎𝒊' THEN RAISE EXCEPTION 'prefix must preserve styled name'; END IF;
 SELECT to_jsonb(p) INTO before_profile FROM public.profiles p WHERE user_id='4a82aebf-98e2-4c76-8f72-145d4e5f2b2c';
 SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) INTO before_appointments FROM public.appointments a WHERE user_id='4a82aebf-98e2-4c76-8f72-145d4e5f2b2c';
 IF before_profile IS NULL OR before_profile->>'full_name' <> '𝑴𝒊𝒎𝒊' THEN RAISE EXCEPTION 'Mimi profile missing'; END IF;
 IF strpos(public.normalize_client_search(before_profile->>'full_name'),public.normalize_client_search('-Mimi'))=0 THEN RAISE EXCEPTION 'Mimi must match old search'; END IF;
 IF before_profile IS DISTINCT FROM (SELECT to_jsonb(p) FROM public.profiles p WHERE user_id='4a82aebf-98e2-4c76-8f72-145d4e5f2b2c') THEN RAISE EXCEPTION 'profile changed'; END IF;
 IF before_appointments IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.appointments a WHERE user_id='4a82aebf-98e2-4c76-8f72-145d4e5f2b2c') THEN RAISE EXCEPTION 'appointments changed'; END IF;
END $$;