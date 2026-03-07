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

    // Get today's month and day (Brazil timezone)
    const now = new Date();
    // Adjust to BRT (UTC-3)
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const month = String(brt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(brt.getUTCDate()).padStart(2, "0");

    console.log(`Checking birthdays for ${day}/${month}`);

    // Fetch all profiles with birth_date matching today's month/day
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, birth_date")
      .not("birth_date", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return json({ error: profilesError.message }, 500);
    }

    // Filter profiles whose birth_date matches today
    const birthdayProfiles = (profiles || []).filter((p: any) => {
      if (!p.birth_date) return false;
      const [, m, d] = p.birth_date.split("-");
      return m === month && d === day;
    });

    if (birthdayProfiles.length === 0) {
      console.log("No birthdays today");
      return json({ success: true, birthdays: 0 });
    }

    console.log(`Found ${birthdayProfiles.length} birthday(s) today`);

    // Check if Evolution WhatsApp is configured and enabled
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "evolution_enabled",
        "evolution_notifications_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.evolution_enabled !== "true") {
      console.log("Evolution not enabled, skipping WhatsApp notifications");
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "Evolution disabled" });
    }

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "Evolution not configured" });
    }

    // Get business name
    const { data: siteSettingsData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteSettingsData?.value || "Rosa de Lis Estética";

    // Fetch admin phones
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

    if (adminPhones.length === 0) {
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "No admin phones" });
    }

    // Send birthday notifications to admins
    const sendMessage = async (phone: string, text: string) => {
      const cleanPhone = phone.replace(/\D/g, "");
      const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      try {
        const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ number, text }),
        });
        const data = await res.json();
        console.log(`Message sent to ${number}:`, res.status);
        return { phone: number, success: res.ok };
      } catch (e) {
        console.error(`Failed to send to ${number}:`, e);
        return { phone: number, success: false };
      }
    };

    const results: any[] = [];

    for (const profile of birthdayProfiles) {
      const [year] = profile.birth_date.split("-");
      const age = brt.getUTCFullYear() - parseInt(year);

      const message = `🎂 *Aniversário de Cliente!*\n\n` +
        `👤 *${profile.full_name}* completa *${age} anos* hoje!\n` +
        `📱 Telefone: ${profile.phone || "Não cadastrado"}\n\n` +
        `💡 Que tal enviar uma mensagem de parabéns ou oferecer um desconto especial? 🎁\n\n` +
        `_${businessName}_`;

      for (const adminPhone of adminPhones) {
        const r = await sendMessage(adminPhone, message);
        results.push({ ...r, client: profile.full_name });
      }
    }

    return json({ success: true, birthdays: birthdayProfiles.length, results });
  } catch (e) {
    console.error("birthday-check error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
