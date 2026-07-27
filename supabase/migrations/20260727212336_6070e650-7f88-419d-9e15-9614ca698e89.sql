CREATE TABLE public.procedure_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('before','after')),
  storage_path text NOT NULL,
  caption text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_photos TO authenticated;
GRANT ALL ON public.procedure_photos TO service_role;

ALTER TABLE public.procedure_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage procedure photos"
ON public.procedure_photos FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'partner'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'partner'));

CREATE POLICY "Clients view own procedure photos"
ON public.procedure_photos FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_procedure_photos_updated_at
BEFORE UPDATE ON public.procedure_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff manage procedure photo files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'procedure-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'partner')))
WITH CHECK (bucket_id = 'procedure-photos' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'partner')));

CREATE POLICY "Clients view own procedure photo files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'procedure-photos' AND (storage.foldername(name))[1] = auth.uid()::text);