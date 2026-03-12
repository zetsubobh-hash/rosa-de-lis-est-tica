-- Drop the global unique index
DROP INDEX IF EXISTS unique_appointment_slot;

-- Create a new unique index per partner (partner_id included)
-- For appointments WITH a partner assigned
CREATE UNIQUE INDEX unique_appointment_slot_per_partner
ON public.appointments (appointment_date, appointment_time, partner_id)
WHERE status IN ('confirmed', 'pending') AND partner_id IS NOT NULL;

-- For appointments WITHOUT a partner (unassigned), keep global uniqueness
CREATE UNIQUE INDEX unique_appointment_slot_unassigned
ON public.appointments (appointment_date, appointment_time)
WHERE status IN ('confirmed', 'pending') AND partner_id IS NULL;