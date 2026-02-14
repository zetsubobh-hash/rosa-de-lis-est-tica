import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "navigate_tab"
  | "create_appointment"
  | "update_appointment"
  | "cancel_appointment"
  | "complete_appointment"
  | "create_partner"
  | "update_partner"
  | "delete_user"
  | "update_user_credentials"
  | "counter_sale"
  | "create_plan"
  | "update_plan"
  | "update_service"
  | "update_pricing"
  | "update_branding"
  | "update_site_settings"
  | "update_payment_settings"
  | "send_whatsapp_test"
  | "other";

interface AuditPayload {
  action: AuditAction;
  details?: Record<string, unknown>;
}

export const logAudit = async ({ action, details = {} }: AuditPayload) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get profile name and role
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const userName = profileRes.data?.full_name || "Desconhecido";
    const roles = roleRes.data?.map((r: any) => r.role) || [];
    const userRole = roles.includes("admin") ? "admin" : roles.includes("partner") ? "partner" : "user";

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      user_name: userName,
      user_role: userRole,
      action,
      details,
    } as any);
  } catch (e) {
    // Silent fail – audit should never break the app
    console.error("[audit]", e);
  }
};
