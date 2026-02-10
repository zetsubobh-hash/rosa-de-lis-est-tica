-- Function to clean up stale pending appointments (older than 30 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_appointments()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.appointments
  WHERE status = 'pending'
    AND created_at < now() - interval '30 minutes';
$$;
