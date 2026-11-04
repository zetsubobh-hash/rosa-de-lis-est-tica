TRUNCATE cron.job_run_details;
TRUNCATE net._http_response;
SELECT cron.unschedule('db-log-cleanup') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='db-log-cleanup');
SELECT cron.schedule('db-log-cleanup', '30 3 * * *', $$
  DELETE FROM cron.job_run_details WHERE end_time < now() - interval '2 days';
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
$$);
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='promo-scheduler-every-minute'), schedule := '*/5 * * * *');