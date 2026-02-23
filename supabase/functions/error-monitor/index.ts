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

    const { errors } = await req.json();

    if (!errors || !Array.isArray(errors) || errors.length === 0) {
      return json({ skipped: true, reason: "No errors provided" });
    }

    // Check if debug monitoring is enabled
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "debug_monitor_enabled",
        "debug_monitor_phone",
        "evolution_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.debug_monitor_enabled !== "true") {
      return json({ skipped: true, reason: "Debug monitor disabled" });
    }

    const phone = cfg.debug_monitor_phone;
    if (!phone) {
      return json({ skipped: true, reason: "No debug phone configured" });
    }

    if (cfg.evolution_enabled !== "true") {
      return json({ skipped: true, reason: "Evolution API disabled" });
    }

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ skipped: true, reason: "Evolution API not configured" });
    }

    // Get business name
    const { data: siteData } = await supabase
      .from("site_settings")
      .select("key, value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteData?.value || "Rosa de Lis Estética";

    // Build a single consolidated message for all errors
    const errorLines = errors.slice(0, 5).map((e: any, i: number) => {
      return `❌ *Erro ${i + 1}:*\n${e.message || "Erro desconhecido"}\n📍 ${e.source || "N/A"}\n🕐 ${e.timestamp || "N/A"}`;
    });

    const message = `🐛 *Debug Monitor - ${businessName}*\n\n${errorLines.join("\n\n")}${errors.length > 5 ? `\n\n...e mais ${errors.length - 5} erro(s)` : ""}\n\n_Monitoramento automático_`;

    // Send WhatsApp
    const cleanPhone = phone.replace(/\D/g, "");
    const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text: message }),
    });

    const data = await res.json();
    console.log(`Debug monitor message sent to ${number}:`, res.status, JSON.stringify(data));

    return json({ success: true, sent_to: number, errors_reported: errors.length });
  } catch (e) {
    console.error("error-monitor error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
