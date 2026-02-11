-- Allow admins to upload/update/delete any avatar (for partner avatars)
CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND has_role(auth.uid(), 'admin'::app_role));