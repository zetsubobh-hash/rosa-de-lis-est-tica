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

    // Get today's month and day (Brazil timezone UTC-3)
    const now = new Date();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const month = String(brt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(brt.getUTCDate()).padStart(2, "0");

    console.log(`Checking birthdays for ${day}/${month}`);

    // Fetch all profiles with birth_date
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

    // Check all settings
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "evolution_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
        "whatsapp_msg_birthday_enabled",
        "whatsapp_msg_birthday_text",
        "whatsapp_msg_birthday_client_enabled",
        "whatsapp_msg_birthday_client_text",
        "birthday_gift_type",
        "birthday_gift_discount",
        "birthday_gift_service",
        "birthday_gift_custom_text",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    if (cfg.evolution_enabled !== "true") {
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "Evolution disabled" });
    }

    const adminEnabled = cfg.whatsapp_msg_birthday_enabled !== "false";
    const clientEnabled = cfg.whatsapp_msg_birthday_client_enabled === "true";

    if (!adminEnabled && !clientEnabled) {
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "Both birthday notifications disabled" });
    }

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const apiKey = cfg.evolution_api_key;
    const instanceName = cfg.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ success: true, birthdays: birthdayProfiles.length, skipped: true, reason: "Evolution not configured" });
    }

    // Build gift text based on type
    let giftText = "";
    switch (cfg.birthday_gift_type) {
      case "discount":
        giftText = cfg.birthday_gift_discount
          ? `Cupom de ${cfg.birthday_gift_discount} de desconto`
          : "Um desconto especial";
        break;
      case "session":
        giftText = cfg.birthday_gift_service
          ? `1 sessão gratuita de ${cfg.birthday_gift_service}`
          : "1 sessão gratuita";
        break;
      case "custom":
        giftText = cfg.birthday_gift_custom_text || "Um presente especial";
        break;
      default:
        giftText = "Uma surpresa especial";
    }

    // Get business name
    const { data: siteSettingsData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteSettingsData?.value || "Rosa de Lis Estética";

    // Fetch admin phones
    let adminPhones: string[] = [];
    if (adminEnabled) {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = adminRoles?.map((r: any) => r.user_id) || [];
      if (adminUserIds.length > 0) {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("phone")
          .in("user_id", adminUserIds);
        adminPhones = adminProfiles?.map((p: any) => p.phone).filter(Boolean) || [];
      }
    }

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

    const applyTemplate = (template: string, vars: Record<string, string>) => {
      let text = template;
      for (const [key, val] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }
      return text;
    };

    const adminTemplate = cfg.whatsapp_msg_birthday_text || "";
    const clientTemplate = cfg.whatsapp_msg_birthday_client_text || "";
    const results: any[] = [];

    for (const profile of birthdayProfiles) {
      const [year] = profile.birth_date.split("-");
      const age = String(brt.getUTCFullYear() - parseInt(year));

      const vars: Record<string, string> = {
        nome: profile.full_name,
        idade: age,
        telefone: profile.phone || "Não cadastrado",
        empresa: businessName,
        brinde: giftText,
      };

      // Send to admins
      if (adminEnabled && adminPhones.length > 0) {
        const adminMsg = adminTemplate
          ? applyTemplate(adminTemplate, vars)
          : `🎂 *Aniversário de Cliente!*\n\n👤 *${vars.nome}* completa *${vars.idade} anos* hoje!\n📱 Telefone: ${vars.telefone}\n🎁 Brinde: ${vars.brinde}\n\n💡 Que tal enviar uma mensagem de parabéns?\n\n_${vars.empresa}_`;

        for (const adminPhone of adminPhones) {
          const r = await sendMessage(adminPhone, adminMsg);
          results.push({ ...r, type: "admin", client: profile.full_name });
        }
      }

      // Send to client
      if (clientEnabled && profile.phone) {
        const clientMsg = clientTemplate
          ? applyTemplate(clientTemplate, vars)
          : `🎂 *Parabéns, ${vars.nome}!* 🎉\n\nA *${vars.empresa}* deseja um feliz aniversário! 🥳\n\nPreparamos um presente especial pra você:\n🎁 *${vars.brinde}*\n\nEntre em contato para agendar! 💕`;

        const r = await sendMessage(profile.phone, clientMsg);
        results.push({ ...r, type: "client", client: profile.full_name });
      }
    }

    return json({ success: true, birthdays: birthdayProfiles.length, results });
  } catch (e) {
    console.error("birthday-check error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});
