CREATE OR REPLACE FUNCTION public.reset_partner_financials(_partner_id uuid, _admin_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog AS $$
DECLARE removed integer;
BEGIN
 IF NOT public.has_role(_admin_id,'admin') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.partners WHERE id=_partner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'partner_not_found'; END IF;
 UPDATE public.partners SET salary_cents=0, commission_pct=0 WHERE id=_partner_id;
 DELETE FROM public.partner_payments WHERE partner_id=_partner_id;
 GET DIAGNOSTICS removed=ROW_COUNT;
 INSERT INTO public.audit_logs(user_id,user_name,user_role,action,details)
 VALUES(_admin_id,coalesce((SELECT full_name FROM public.profiles WHERE user_id=_admin_id),'Admin'),'admin','partner_financial_reset',jsonb_build_object('partner_id',_partner_id,'removed_payments',removed));
 RETURN jsonb_build_object('success',true,'removed_payments',removed);
END $$;
REVOKE ALL ON FUNCTION public.reset_partner_financials(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reset_partner_financials(uuid,uuid) TO service_role;