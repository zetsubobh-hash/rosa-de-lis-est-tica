-- Add column to track if reminder was sent
ALTER TABLE public.appointments ADD COLUMN reminder_sent boolean NOT NULL DEFAULT false;

-- Enable pg_cron and pg_net for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;