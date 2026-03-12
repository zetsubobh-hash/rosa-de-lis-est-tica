
-- Table to store opt-out (unsubscribe) requests
CREATE TABLE public.promo_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);

ALTER TABLE public.promo_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (the unsubscribe page is public)
CREATE POLICY "Anyone can unsubscribe" ON public.promo_unsubscribes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Admins can manage
CREATE POLICY "Admins can manage unsubscribes" ON public.promo_unsubscribes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
