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

function randomString(chars: string, len: number): string {
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}
function generatePassword(): string {
  return randomString("abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);
}
async function sha256(v: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const GENERIC = "Se o telefone estiver cadastrado, enviamos um código de verificação para o seu WhatsApp.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();

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

    const { data: settingsData } = await supabase
      .from("payment_settings")
      .select("key, value")
      .in("key", ["evolution_enabled", "evolution_api_url", "evolution_api_key", "evolution_instance_name"]);
    const cfg: Record<string, string> = {};
    settingsData?.forEach((r: any) => { cfg[r.key] = r.value; });
    const waReady = cfg.evolution_enabled === "true" && cfg.evolution_api_url && cfg.evolution_api_key && cfg.evolution_instance_name;
    const number = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const sendWa = async (text: string) => {
      const apiUrl = cfg.evolution_api_url.replace(/\/+$/, "");
      const res = await fetch(`${apiUrl}/message/sendText/${cfg.evolution_instance_name}`, {
        method: "POST",
        headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number, text }),
      });
      return res.ok;
    };

    // Step 1: send a one-time verification code to the WhatsApp on file
    if (!code) {
      if (!profile || !waReady) return json({ success: true, step: "code", message: GENERIC });
      const otp = randomString("0123456789", 6);
      await supabase.from("password_reset_codes").update({ used: true }).eq("user_id", profile.user_id).eq("used", false);
      await supabase.from("password_reset_codes").insert({
        user_id: profile.user_id,
        code_hash: await sha256(`${profile.user_id}:${otp}`),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      try {
        await sendWa(`🔐 Seu código para redefinir a senha é: *${otp}*\n\nVálido por 10 minutos. Se não foi você, ignore esta mensagem.`);
      } catch (e) {
        console.error("WhatsApp send error:", e instanceof Error ? e.message : "unknown");
      }
      return json({ success: true, step: "code", message: GENERIC });
    }

    // Step 2: verify the code before changing the password
    if (typeof code !== "string" || !/^\d{6}$/.test(code) || !profile) {
      return json({ error: "Código inválido ou expirado." }, 400);
    }
    const { data: pending } = await supabase
      .from("password_reset_codes")
      .select("id, code_hash, attempts, expires_at")
      .eq("user_id", profile.user_id)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pending || new Date(pending.expires_at).getTime() < Date.now() || pending.attempts >= 5) {
      return json({ error: "Código inválido ou expirado." }, 400);
    }
    if (pending.code_hash !== (await sha256(`${profile.user_id}:${code}`))) {
      await supabase.from("password_reset_codes").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);
      return json({ error: "Código inválido ou expirado." }, 400);
    }
    await supabase.from("password_reset_codes").update({ used: true }).eq("id", pending.id);


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


    // Fetch business name
    const { data: siteSetting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = siteSetting?.value || "Rosa de Lis Estética";

    let whatsappSent = false;

    if (waReady) {

      const message = `🔐 *${businessName} - Redefinição de Senha*\n\nOlá, ${profile.full_name}!\n\nSua senha foi redefinida com sucesso.\n\n👤 *Usuário:* ${profile.full_name}\n🔑 *Nova senha:* ${newPassword}\n\nAcesse o app e faça login com sua nova senha. Recomendamos alterá-la depois no seu perfil.\n\n📲 *Acesse o app:* https://rosadelis.com\n\n_${businessName}_`;

      try {
        whatsappSent = await sendWa(message);
      } catch (e) {
        console.error("WhatsApp send error:", e instanceof Error ? e.message : "unknown");
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
