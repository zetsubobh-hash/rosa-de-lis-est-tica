CREATE OR REPLACE FUNCTION public.get_agenda_client_labels(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT p.user_id, p.full_name, p.avatar_url FROM public.profiles p
 WHERE p.user_id = ANY(_user_ids)
 AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'partner') AND EXISTS (SELECT 1 FROM public.partners pr WHERE pr.user_id = auth.uid() AND pr.is_active)))
 AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.user_id = p.user_id);
$$;
REVOKE ALL ON FUNCTION public.get_agenda_client_labels(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agenda_client_labels(uuid[]) TO authenticated;