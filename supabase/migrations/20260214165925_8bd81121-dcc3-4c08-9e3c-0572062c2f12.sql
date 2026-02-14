
CREATE POLICY "Only master admin can delete audit logs"
ON public.audit_logs FOR DELETE
TO authenticated
USING (auth.uid() = '4649913b-f48b-470e-b407-251803756157');
