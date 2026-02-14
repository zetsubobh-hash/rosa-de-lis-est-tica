
-- Audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only master admin can read
CREATE POLICY "Only master admin can read audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = '4649913b-f48b-470e-b407-251803756157');

-- Any authenticated can insert (for logging purposes)
CREATE POLICY "Authenticated can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to log actions easily
CREATE OR REPLACE FUNCTION public.log_audit(
  _user_id uuid,
  _user_name text,
  _user_role text,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (user_id, user_name, user_role, action, details)
  VALUES (_user_id, _user_name, _user_role, _action, _details);
$$;
