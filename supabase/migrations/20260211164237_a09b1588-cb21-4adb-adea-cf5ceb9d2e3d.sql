SELECT cron.schedule(
  'appointment-reminder-cron',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://sxzmtnsfsyifujdnqyzr.supabase.co/functions/v1/appointment-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4em10bnNmc3lpZnVqZG5xeXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDc1OTcsImV4cCI6MjA4NjMyMzU5N30.WIaOFGFVrQ2eqroPSrujSC79gWdEz8UsIcrFbeL--X0"}'::jsonb,
        body:='{}'::jsonb
    ) AS request_id;
  $$
);