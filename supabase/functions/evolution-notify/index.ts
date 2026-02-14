import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { appointment_ids } = await req.json();

    if (!appointment_ids || !Array.isArray(appointment_ids) || appointment_ids.length === 0) {
      return json({ skipped: true, reason: "No appointment IDs" });
    }

    // Check if notifications are enabled and Evolution is configured
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "evolution_enabled",
        "evolution_notifications_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
        "whatsapp_msg_admin_enabled",
        "whatsapp_msg_admin_text",
        "whatsapp_msg_partner_enabled",
        "whatsapp_msg_partner_text",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.evolution_enabled !== "true" || cfg.evolution_notifications_enabled !== "true") {
      return json({ skipped: true, reason: "Notifications disabled" });
    }

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ skipped: true, reason: "Evolution API not configured" });
    }

    // Fetch appointment details
    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, service_title, appointment_date, appointment_time, user_id, partner_id")
      .in("id", appointment_ids);

    if (!appointments || appointments.length === 0) {
      return json({ skipped: true, reason: "No appointments found" });
    }

    // Fetch client profiles
    const userIds = [...new Set(appointments.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    // Fetch admin phones (all admin user_ids -> their profiles)
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = adminRoles?.map((r: any) => r.user_id) || [];
    let adminPhones: string[] = [];
    if (adminUserIds.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("phone")
        .in("user_id", adminUserIds);
      adminPhones = adminProfiles?.map((p: any) => p.phone).filter(Boolean) || [];
    }

    // Fetch involved partners
    const partnerIds = [...new Set(appointments.map((a) => a.partner_id).filter(Boolean))];
    let partnerPhones: Record<string, string> = {};
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, phone, full_name")
        .in("id", partnerIds);
      partners?.forEach((p: any) => { partnerPhones[p.id] = p.phone; });
    }

    // Build messages and send
    const sendMessage = async (phone: string, text: string) => {
      const cleanPhone = phone.replace(/\D/g, "");
      const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      try {
        const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            number,
            text,
          }),
        });
        const data = await res.json();
        console.log(`Message sent to ${number}:`, res.status, JSON.stringify(data));
        return { phone: number, success: res.ok };
      } catch (e) {
        console.error(`Failed to send to ${number}:`, e);
        return { phone: number, success: false };
      }
    };

    const results: any[] = [];

    const adminEnabled = cfg.whatsapp_msg_admin_enabled !== "false"; // default true for backward compat
    const adminTemplate = cfg.whatsapp_msg_admin_text || "";
    const partnerEnabled = cfg.whatsapp_msg_partner_enabled !== "false";
    const partnerTemplate = cfg.whatsapp_msg_partner_text || "";

    const applyTemplate = (template: string, vars: Record<string, string>) => {
      let text = template;
      for (const [key, val] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }
      return text;
    };

    for (const apt of appointments) {
      const client = profileMap[apt.user_id];
      const clientName = client?.full_name || "Cliente";
      const [y, m, d] = apt.appointment_date.split("-");
      const dateFormatted = `${d}/${m}/${y}`;

      const vars = { nome: clientName, servico: apt.service_title, data: dateFormatted, hora: apt.appointment_time };

      // Send to all admins
      if (adminEnabled) {
        const adminMsg = adminTemplate
          ? applyTemplate(adminTemplate, vars)
          : `📋 *Novo Agendamento*\n\n👤 *Cliente:* ${clientName}\n💆 *Serviço:* ${apt.service_title}\n📅 *Data:* ${dateFormatted}\n🕐 *Horário:* ${apt.appointment_time}\n\n_Rosa de Lis — Estética Avançada_`;

        for (const phone of adminPhones) {
          const r = await sendMessage(phone, adminMsg);
          results.push({ ...r, type: "admin", appointment_id: apt.id });
        }
      }

      // Send to assigned partner
      if (partnerEnabled && apt.partner_id && partnerPhones[apt.partner_id]) {
        const partnerMsg = partnerTemplate
          ? applyTemplate(partnerTemplate, vars)
          : `📋 *Agendamento Atribuído a Você*\n\n👤 *Cliente:* ${clientName}\n💆 *Serviço:* ${apt.service_title}\n📅 *Data:* ${dateFormatted}\n🕐 *Horário:* ${apt.appointment_time}\n\n_Rosa de Lis — Estética Avançada_`;

        const r = await sendMessage(partnerPhones[apt.partner_id], partnerMsg);
        results.push({ ...r, type: "partner", appointment_id: apt.id });
      }
    }

    return json({ success: true, results });
  } catch (e) {
    console.error("evolution-notify error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
