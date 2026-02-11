
-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Allow anyone to view branding files (public)
CREATE POLICY "Branding files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Only admins can upload branding files
CREATE POLICY "Admins can upload branding files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding'
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can update branding files
CREATE POLICY "Admins can update branding files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding'
  AND public.has_role(auth.uid(), 'admin')
);

-- Only admins can delete branding files
CREATE POLICY "Admins can delete branding files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding'
  AND public.has_role(auth.uid(), 'admin')
);
