ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS room_number integer NOT NULL DEFAULT 1;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_room_number_range CHECK (room_number BETWEEN 1 AND 10);

INSERT INTO public.site_settings(key,value) VALUES ('treatment_rooms','1') ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.treatment_rooms_count() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT LEAST(10, GREATEST(1, COALESCE(NULLIF(regexp_replace((SELECT value FROM public.site_settings WHERE key='treatment_rooms'),'[^0-9]','','g'),'')::int,1)));
$$;
GRANT EXECUTE ON FUNCTION public.treatment_rooms_count() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.assign_appointment_room() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int := public.treatment_rooms_count(); r int;
BEGIN
 IF NEW.status NOT IN ('confirmed','pending') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.appointment_date=OLD.appointment_date AND NEW.appointment_time=OLD.appointment_time AND NEW.room_number=OLD.room_number AND OLD.status IN ('confirmed','pending') THEN RETURN NEW; END IF;
 IF NEW.room_number BETWEEN 1 AND n AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id<>NEW.id AND a.appointment_date=NEW.appointment_date AND a.appointment_time=NEW.appointment_time AND a.room_number=NEW.room_number AND a.status IN ('confirmed','pending')) THEN RETURN NEW; END IF;
 SELECT g INTO r FROM generate_series(1,n) g WHERE NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.id<>NEW.id AND a.appointment_date=NEW.appointment_date AND a.appointment_time=NEW.appointment_time AND a.room_number=g AND a.status IN ('confirmed','pending')) ORDER BY g LIMIT 1;
 IF r IS NULL THEN RAISE EXCEPTION 'Todas as salas estão ocupadas neste horário' USING ERRCODE='23505'; END IF;
 NEW.room_number := r; RETURN NEW;
END $$;
CREATE TRIGGER assign_appointment_room_trg BEFORE INSERT OR UPDATE OF appointment_date, appointment_time, room_number, status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.assign_appointment_room();

DROP INDEX IF EXISTS public.unique_appointment_slot_unassigned;
CREATE UNIQUE INDEX unique_appointment_slot_room ON public.appointments (appointment_date, appointment_time, room_number) WHERE status IN ('confirmed','pending');

CREATE OR REPLACE FUNCTION public.get_booked_slots(p_date date, p_partner_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(appointment_time text) LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.appointment_time::text FROM public.appointments a
  WHERE a.appointment_date=p_date AND a.status IN ('confirmed','pending')
  GROUP BY a.appointment_time
  HAVING count(*) >= public.treatment_rooms_count() OR (p_partner_id IS NOT NULL AND bool_or(a.partner_id=p_partner_id));
$$;