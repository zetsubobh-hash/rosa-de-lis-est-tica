REVOKE EXECUTE ON FUNCTION public.assign_appointment_room() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.treatment_rooms_count() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.treatment_rooms_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treatment_rooms_count() TO authenticated, service_role;