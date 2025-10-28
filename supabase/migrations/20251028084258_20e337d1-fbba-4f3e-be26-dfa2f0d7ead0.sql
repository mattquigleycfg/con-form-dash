-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule job costs sync to run every hour
SELECT cron.schedule(
  'sync-job-costs-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://hfscflqjpozqyfpohvjj.supabase.co/functions/v1/sync-job-costs',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzIxNjcsImV4cCI6MjA3NTQ0ODE2N30.KEAq-MRvKH3HRocMCW7sHKMSQPob0nAGIa9-3RgUFug"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);