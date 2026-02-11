-- Update cleanup function to 15 minutes instead of 30
CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_appointments()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.appointments
  WHERE status = 'pending'
    AND created_at < now() - interval '15 minutes';
$$;
