
-- Create coupons table for birthday gift codes
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent', -- 'percent' or 'fixed'
  discount_value numeric NOT NULL DEFAULT 0, -- percent value or cents
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  used_appointment_id uuid,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Users can view their own coupons
CREATE POLICY "Users can view own coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can update own coupons (for redemption)
CREATE POLICY "Users can update own coupons" ON public.coupons
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all coupons
CREATE POLICY "Admins can manage all coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (edge function)
CREATE POLICY "Service can insert coupons" ON public.coupons
  FOR INSERT TO authenticated
  WITH CHECK (true);
