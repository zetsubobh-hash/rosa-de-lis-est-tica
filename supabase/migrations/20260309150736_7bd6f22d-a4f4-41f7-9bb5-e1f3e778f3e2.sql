
-- Remove old keep-alive job
SELECT cron.unschedule('supabase-keep-alive');

-- Create a more robust keep-alive that runs DAILY at 06:00 UTC
-- It does a real read from a table to generate actual database activity
SELECT cron.schedule(
  'supabase-keep-alive',
  '0 6 * * *',
  $$
    SELECT count(*) FROM public.site_settings WHERE key = 'business_name';
  $$
);
