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

function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== "string") {
      return json({ error: "Informe o telefone cadastrado." }, 400);
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return json({ error: "Telefone inválido." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find profile by phone (try exact match and common formats)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone, username")
      .limit(100);

    // Match by cleaned digits
    const profile = profiles?.find((p: any) => {
      const pDigits = (p.phone || "").replace(/\D/g, "");
      return pDigits === cleanPhone || pDigits === `55${cleanPhone}` || `55${pDigits}` === cleanPhone;
    });

    if (!profile) {
      return json({ error: "Nenhuma conta encontrada com esse telefone." }, 404);
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return json({ error: "Erro ao redefinir senha. Tente novamente." }, 500);
    }

    // Send new password via WhatsApp
    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", [
        "evolution_enabled",
        "evolution_api_url",
        "evolution_api_key",
        "evolution_instance_name",
      ]);

    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });

    // Fetch business name
    const { data: siteSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteSetting?.value || "Rosa de Lis Estética";

    let whatsappSent = false;

    if (cfg.evolution_enabled === "true" && cfg.evolution_api_url && cfg.evolution_api_key && cfg.evolution_instance_name) {
      const apiUrl = cfg.evolution_api_url.replace(/\/+$/, "");
      const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

      const message = `🔐 *${businessName} - Redefinição de Senha*\n\nOlá, ${profile.full_name}!\n\nSua senha foi redefinida com sucesso.\n\n👤 *Usuário:* ${profile.full_name}\n🔑 *Nova senha:* ${newPassword}\n\nAcesse o app e faça login com sua nova senha. Recomendamos alterá-la depois no seu perfil.\n\n_${businessName}_`;

      try {
        const res = await fetch(`${apiUrl}/message/sendText/${cfg.evolution_instance_name}`, {
          method: "POST",
          headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" },
          body: JSON.stringify({ number, text: message }),
        });
        whatsappSent = res.ok;
        console.log(`Password reset WhatsApp sent to ${number}:`, res.status);
      } catch (e) {
        console.error("WhatsApp send error:", e);
      }
    }

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: profile.user_id,
      user_name: profile.full_name,
      user_role: "user",
      action: "password_reset",
      details: { method: "whatsapp", whatsapp_sent: whatsappSent },
    });

    return json({
      success: true,
      whatsapp_sent: whatsappSent,
      message: whatsappSent
        ? "Nova senha enviada para o seu WhatsApp!"
        : "Senha redefinida, mas não foi possível enviar via WhatsApp. Entre em contato com o estabelecimento.",
    });
  } catch (err) {
    console.error("reset-password error:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});
