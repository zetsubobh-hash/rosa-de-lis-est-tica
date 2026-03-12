CREATE UNIQUE INDEX unique_appointment_slot
ON public.appointments (appointment_date, appointment_time)
WHERE status IN ('confirmed', 'pending');