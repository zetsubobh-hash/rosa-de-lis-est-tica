CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER FUNCTION public.get_agenda_client_labels(uuid[]) SET SCHEMA private;
CREATE FUNCTION public.get_agenda_client_labels(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM private.get_agenda_client_labels(_user_ids); $$;
REVOKE ALL ON FUNCTION public.get_agenda_client_labels(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agenda_client_labels(uuid[]) TO authenticated;