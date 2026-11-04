CREATE OR REPLACE FUNCTION public.system_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'cron_log_bytes', COALESCE((SELECT pg_total_relation_size('cron.job_run_details')),0),
    'net_log_bytes', COALESCE((SELECT pg_total_relation_size('net._http_response')),0),
    'audit_rows', (SELECT count(*) FROM public.audit_logs),
    'page_view_rows', (SELECT count(*) FROM public.page_views),
    'connections', (SELECT count(*) FROM pg_stat_activity),
    'max_connections', current_setting('max_connections')::int,
    'stale_pending', (SELECT count(*) FROM public.appointments WHERE status='pending' AND created_at < now() - interval '1 hour'),
    'checked_at', now()
  ) INTO r;
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.system_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE c1 int; c2 int; c3 int; c4 int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days'; GET DIAGNOSTICS c1 = ROW_COUNT;
  DELETE FROM net._http_response WHERE created < now() - interval '2 days'; GET DIAGNOSTICS c2 = ROW_COUNT;
  DELETE FROM public.page_views WHERE created_at < now() - interval '180 days'; GET DIAGNOSTICS c3 = ROW_COUNT;
  SELECT public.cleanup_old_audit_logs() INTO c4;
  PERFORM public.cleanup_stale_pending_appointments();
  RETURN jsonb_build_object('cron_logs', c1, 'http_logs', c2, 'page_views', c3, 'audit_logs', c4);
END $$;

REVOKE ALL ON FUNCTION public.system_health() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.system_maintenance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.system_maintenance() TO authenticated;