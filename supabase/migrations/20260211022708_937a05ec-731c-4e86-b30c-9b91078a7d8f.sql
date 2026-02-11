
-- Partners table
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  avatar_url text,
  commission_pct numeric(5,2) NOT NULL DEFAULT 0,
  work_days text[] NOT NULL DEFAULT '{seg,ter,qua,qui,sex}',
  work_start text NOT NULL DEFAULT '08:00',
  work_end text NOT NULL DEFAULT '18:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Admin can manage all partners
CREATE POLICY "Admins can manage all partners"
  ON public.partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view own record
CREATE POLICY "Partners can view own record"
  ON public.partners FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone authenticated can read active partners (for assignment dropdowns)
CREATE POLICY "Authenticated can read active partners"
  ON public.partners FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Partner-Service mapping (specialties)
CREATE TABLE public.partner_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  service_slug text NOT NULL,
  UNIQUE(partner_id, service_slug)
);

ALTER TABLE public.partner_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner_services"
  ON public.partner_services FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read partner_services"
  ON public.partner_services FOR SELECT
  USING (true);

-- Add partner_id to appointments
ALTER TABLE public.appointments ADD COLUMN partner_id uuid REFERENCES public.partners(id);

-- Add 'partner' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';
