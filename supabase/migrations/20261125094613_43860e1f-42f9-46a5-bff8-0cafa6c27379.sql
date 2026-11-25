CREATE POLICY "No direct client access to whatsapp_send_dedup"
ON public.whatsapp_send_dedup
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);