
-- Table to track partner payment history (salary, advances, adjustments)
CREATE TABLE public.partner_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'salary', -- salary, advance, bonus, deduction, other
  description TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  reference_month TEXT NOT NULL, -- e.g. '2026-02'
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner payments"
ON public.partner_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own payments"
ON public.partner_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partners p
    WHERE p.id = partner_payments.partner_id
    AND p.user_id = auth.uid()
  )
);

CREATE INDEX idx_partner_payments_partner_month ON public.partner_payments(partner_id, reference_month);
