
CREATE TABLE public.site_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view themes" ON public.site_themes FOR SELECT USING (true);
CREATE POLICY "Admins can manage themes" ON public.site_themes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure only one active theme at a time
CREATE UNIQUE INDEX idx_site_themes_active ON public.site_themes (is_active) WHERE (is_active = true);
