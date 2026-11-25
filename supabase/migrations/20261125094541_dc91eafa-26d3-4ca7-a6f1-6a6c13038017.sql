CREATE TABLE IF NOT EXISTS public.whatsapp_send_dedup (
  dedup_key TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_send_dedup_created_at
  ON public.whatsapp_send_dedup (created_at);

REVOKE ALL ON public.whatsapp_send_dedup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_send_dedup TO service_role;

ALTER TABLE public.whatsapp_send_dedup ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_send(p_key TEXT, p_source TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.whatsapp_send_dedup (dedup_key, source)
  VALUES (btrim(p_key), COALESCE(NULLIF(btrim(p_source), ''), 'unknown'))
  ON CONFLICT (dedup_key) DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_send(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_send(TEXT, TEXT) TO service_role;