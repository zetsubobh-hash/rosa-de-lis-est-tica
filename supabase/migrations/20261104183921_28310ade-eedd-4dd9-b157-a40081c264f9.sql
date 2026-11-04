ALTER TABLE public.services ADD COLUMN IF NOT EXISTS gallery_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.service_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug text NOT NULL,
  before_url text NOT NULL,
  after_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_gallery TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_gallery TO authenticated;
GRANT ALL ON public.service_gallery TO service_role;
ALTER TABLE public.service_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view gallery" ON public.service_gallery FOR SELECT USING (true);
CREATE POLICY "Admins manage gallery" ON public.service_gallery FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX service_gallery_slug_idx ON public.service_gallery(service_slug, sort_order);
CREATE TRIGGER update_service_gallery_updated_at BEFORE UPDATE ON public.service_gallery
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();