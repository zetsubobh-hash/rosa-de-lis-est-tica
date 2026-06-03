CREATE TABLE public.cash_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_expenses TO authenticated;
GRANT ALL ON public.cash_expenses TO service_role;

ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all cash expenses"
ON public.cash_expenses
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_cash_expenses_date ON public.cash_expenses(expense_date DESC);

CREATE TRIGGER update_cash_expenses_updated_at
BEFORE UPDATE ON public.cash_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();