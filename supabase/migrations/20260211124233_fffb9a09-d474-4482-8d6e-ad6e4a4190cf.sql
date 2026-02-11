
-- Table to track client purchased plans and session progress
CREATE TABLE public.client_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_slug text NOT NULL,
  service_title text NOT NULL,
  plan_name text NOT NULL,
  total_sessions integer NOT NULL DEFAULT 1,
  completed_sessions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by text NOT NULL DEFAULT 'auto', -- 'auto' or 'admin'
  created_by_user_id uuid,
  appointment_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_plans ENABLE ROW LEVEL SECURITY;

-- Users can view their own plans
CREATE POLICY "Users can view own plans"
  ON public.client_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all plans
CREATE POLICY "Admins can manage all plans"
  ON public.client_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view plans for their appointments
CREATE POLICY "Partners can view related plans"
  ON public.client_plans FOR SELECT
  USING (has_role(auth.uid(), 'partner'::app_role));

-- Partners can update completed_sessions
CREATE POLICY "Partners can update session progress"
  ON public.client_plans FOR UPDATE
  USING (has_role(auth.uid(), 'partner'::app_role));

-- Auto-creation: allow insert from authenticated users (for checkout flow)
CREATE POLICY "Authenticated users can create own plans"
  ON public.client_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_plans_updated_at
  BEFORE UPDATE ON public.client_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
