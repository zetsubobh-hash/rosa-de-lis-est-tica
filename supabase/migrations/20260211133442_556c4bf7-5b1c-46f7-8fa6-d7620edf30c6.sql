-- Add plan_id and session_number to appointments to link each session to a plan
ALTER TABLE public.appointments ADD COLUMN plan_id uuid REFERENCES public.client_plans(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN session_number integer;

-- Index for quick lookups
CREATE INDEX idx_appointments_plan_id ON public.appointments(plan_id);
