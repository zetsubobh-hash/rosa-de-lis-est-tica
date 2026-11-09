CREATE TABLE public.whatsapp_bot_sessions (
  phone text PRIMARY KEY,
  user_id uuid,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  handed_off boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.whatsapp_bot_sessions TO authenticated;
GRANT ALL ON public.whatsapp_bot_sessions TO service_role;
ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bot sessions" ON public.whatsapp_bot_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_whatsapp_bot_sessions_updated BEFORE UPDATE ON public.whatsapp_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_settings (key, value) VALUES
  ('whatsapp_bot_enabled', 'false'),
  ('whatsapp_bot_name', 'Lis'),
  ('whatsapp_bot_webhook_token', replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;