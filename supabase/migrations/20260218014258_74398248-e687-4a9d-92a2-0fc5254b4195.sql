
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule a keep-alive job every 3 days
-- It simply pings the database with a lightweight query
SELECT cron.schedule(
  'supabase-keep-alive',
  '0 6 */3 * *',  -- every 3 days at 6:00 AM UTC
  $$SELECT 1;$$
);
