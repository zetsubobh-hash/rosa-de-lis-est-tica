
-- Tabela de agendamentos
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_slug TEXT NOT NULL,
  service_title TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own appointments"
ON public.appointments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own appointments"
ON public.appointments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
ON public.appointments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments"
ON public.appointments FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index para buscas por data
CREATE INDEX idx_appointments_date ON public.appointments (appointment_date);
CREATE INDEX idx_appointments_user ON public.appointments (user_id);
