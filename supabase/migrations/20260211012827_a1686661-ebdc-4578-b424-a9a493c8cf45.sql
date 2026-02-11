
-- Table to store editable service plan prices
CREATE TABLE public.service_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug text NOT NULL,
  plan_name text NOT NULL, -- Essencial, Premium, VIP
  sessions integer NOT NULL DEFAULT 1,
  price_per_session_cents integer NOT NULL DEFAULT 0,
  total_price_cents integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(service_slug, plan_name)
);

-- Enable RLS
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read prices
CREATE POLICY "Anyone can read service prices"
ON public.service_prices
FOR SELECT
USING (true);

-- Only admins can manage prices
CREATE POLICY "Admins can manage service prices"
ON public.service_prices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_service_prices_updated_at
BEFORE UPDATE ON public.service_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with current hardcoded prices (12 services × 3 plans = 36 rows)
INSERT INTO public.service_prices (service_slug, plan_name, sessions, price_per_session_cents, total_price_cents) VALUES
-- Drenagem Linfática
('drenagem-linfatica', 'Essencial', 5, 15000, 75000),
('drenagem-linfatica', 'Premium', 10, 13000, 130000),
('drenagem-linfatica', 'VIP', 20, 11000, 220000),
-- Criolipólise
('criolipólise', 'Essencial', 1, 50000, 50000),
('criolipólise', 'Premium', 2, 45000, 90000),
('criolipólise', 'VIP', 3, 40000, 120000),
-- Botox
('botox', 'Essencial', 1, 80000, 80000),
('botox', 'Premium', 2, 70000, 140000),
('botox', 'VIP', 3, 65000, 195000),
-- Carboxiterapia
('carboxiterapia', 'Essencial', 5, 20000, 100000),
('carboxiterapia', 'Premium', 10, 17000, 170000),
('carboxiterapia', 'VIP', 20, 15000, 300000),
-- Peeling de Diamante
('peeling-de-diamante', 'Essencial', 3, 18000, 54000),
('peeling-de-diamante', 'Premium', 6, 15500, 93000),
('peeling-de-diamante', 'VIP', 10, 13500, 135000),
-- Peeling de Cristal
('peeling-de-cristal', 'Essencial', 3, 18000, 54000),
('peeling-de-cristal', 'Premium', 6, 15500, 93000),
('peeling-de-cristal', 'VIP', 10, 13500, 135000),
-- Massagem Redutora
('massagem-redutora', 'Essencial', 5, 13000, 65000),
('massagem-redutora', 'Premium', 10, 11500, 115000),
('massagem-redutora', 'VIP', 15, 10000, 150000),
-- Massagem Modeladora
('massagem-modeladora', 'Essencial', 5, 14000, 70000),
('massagem-modeladora', 'Premium', 10, 12000, 120000),
('massagem-modeladora', 'VIP', 15, 10500, 157500),
-- Limpeza de Pele
('limpeza-de-pele', 'Essencial', 1, 12000, 12000),
('limpeza-de-pele', 'Premium', 6, 10000, 60000),
('limpeza-de-pele', 'VIP', 12, 8500, 102000),
-- Microagulhamento
('microagulhamento', 'Essencial', 3, 35000, 105000),
('microagulhamento', 'Premium', 4, 30000, 120000),
('microagulhamento', 'VIP', 6, 27000, 162000),
-- Radiofrequência
('radiofrequencia', 'Essencial', 4, 25000, 100000),
('radiofrequencia', 'Premium', 8, 21500, 172000),
('radiofrequencia', 'VIP', 12, 19000, 228000),
-- Protocolo Pós-Operatório
('protocolo-pos-operatorio', 'Essencial', 5, 20000, 100000),
('protocolo-pos-operatorio', 'Premium', 10, 17500, 175000),
('protocolo-pos-operatorio', 'VIP', 20, 15000, 300000);
