
-- Function to auto-cleanup old audit logs based on configured hours
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enabled text;
  _hours text;
  _deleted integer;
BEGIN
  SELECT value INTO _enabled FROM site_settings WHERE key = 'audit_auto_cleanup';
  SELECT value INTO _hours FROM site_settings WHERE key = 'audit_cleanup_hours';
  
  IF _enabled IS NULL OR _enabled != 'true' THEN
    RETURN 0;
  END IF;
  
  DELETE FROM audit_logs
  WHERE created_at < now() - (COALESCE(_hours, '48')::integer || ' hours')::interval;
  
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;
