import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Check if Evolution notifications are enabled
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "evolution_enabled",
        "evolution_notifications_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
        "whatsapp_msg_reminder_enabled",
        "whatsapp_msg_reminder_text",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.evolution_enabled !== "true" || cfg.evolution_notifications_enabled !== "true") {
      return json({ skipped: true, reason: "Notifications disabled" });
    }

    if (cfg.whatsapp_msg_reminder_enabled !== "true") {
      return json({ skipped: true, reason: "Reminder notifications disabled" });
    }

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ skipped: true, reason: "Evolution API not configured" });
    }

    const reminderTemplate = cfg.whatsapp_msg_reminder_text || 
      "Olá {nome}! 🔔 Lembrete: você tem um agendamento de *{servico}* hoje às *{hora}*. Te esperamos! 💖";

    // Get current time in Brasília timezone (UTC-3)
    const now = new Date();
    const brasiliaOffset = -3 * 60; // minutes
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset + now.getTimezoneOffset()) * 60000);
    
    const todayStr = brasiliaTime.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;

    // Find appointments happening in the next 45-75 minutes (window around 1 hour)
    const targetMinStart = currentTotalMinutes + 45;
    const targetMinEnd = currentTotalMinutes + 75;

    // Fetch today's confirmed appointments that haven't received a reminder
    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, service_title, appointment_date, appointment_time, user_id")
      .eq("appointment_date", todayStr)
      .eq("status", "confirmed")
      .eq("reminder_sent", false);

    if (!appointments || appointments.length === 0) {
      return json({ skipped: true, reason: "No appointments to remind" });
    }

    // Filter appointments within the 1-hour window
    const toRemind = appointments.filter((a) => {
      const [h, m] = a.appointment_time.split(":").map(Number);
      const aptMinutes = h * 60 + m;
      return aptMinutes >= targetMinStart && aptMinutes <= targetMinEnd;
    });

    if (toRemind.length === 0) {
      return json({ skipped: true, reason: "No appointments in reminder window" });
    }

    // Fetch client profiles
    const userIds = [...new Set(toRemind.map((a) => a.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    // Send reminders
    const results: any[] = [];

    for (const apt of toRemind) {
      const client = profileMap[apt.user_id];
      if (!client?.phone) {
        console.log(`Skipping appointment ${apt.id}: no phone for user ${apt.user_id}`);
        continue;
      }

      const [y, mo, d] = apt.appointment_date.split("-");
      const dateFormatted = `${d}/${mo}/${y}`;

      const message = reminderTemplate
        .replace(/{nome}/g, client.full_name || "Cliente")
        .replace(/{servico}/g, apt.service_title)
        .replace(/{data}/g, dateFormatted)
        .replace(/{hora}/g, apt.appointment_time);

      const cleanPhone = client.phone.replace(/\D/g, "");
      const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      try {
        const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ number, text: message }),
        });
        const data = await res.json();
        console.log(`Reminder sent to ${number}:`, res.status);

        // Mark as sent
        await supabase
          .from("appointments")
          .update({ reminder_sent: true })
          .eq("id", apt.id);

        results.push({ appointment_id: apt.id, phone: number, success: res.ok });
      } catch (e) {
        console.error(`Failed to send reminder to ${number}:`, e);
        results.push({ appointment_id: apt.id, phone: number, success: false });
      }
    }

    return json({ success: true, reminders_sent: results.length, results });
  } catch (e) {
    console.error("appointment-reminder error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
