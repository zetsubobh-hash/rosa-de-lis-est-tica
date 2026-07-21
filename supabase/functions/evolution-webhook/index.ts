import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Keywords that trigger auto-unsubscribe (case/accents insensitive)
const OPT_OUT_KEYWORDS = ["sair", "parar", "cancelar", "stop", "remover", "descadastrar"];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const extractText = (payload: any): string => {
  const m = payload?.data?.message ?? payload?.message ?? {};
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    payload?.data?.body ||
    payload?.text ||
    ""
  );
};

const extractPhone = (payload: any): string => {
  const jid =
    payload?.data?.key?.remoteJid ||
    payload?.data?.remoteJid ||
    payload?.key?.remoteJid ||
    payload?.sender ||
    "";
  const digits = String(jid).split("@")[0].replace(/\D/g, "");
  return digits;
};

const isFromMe = (payload: any): boolean =>
  Boolean(payload?.data?.key?.fromMe ?? payload?.key?.fromMe);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const raw = await req.text();
    if (raw.length > 20000) return json({ skipped: true, reason: "Payload too large" });

    let payload: any;
    try { payload = JSON.parse(raw); } catch { return json({ ok: true, skipped: "invalid_json" }); }

    // Only process incoming user messages
    if (isFromMe(payload)) return json({ ok: true, skipped: "from_me" });

    const text = extractText(payload);
    const phone = extractPhone(payload);
    if (!text || !phone) return json({ ok: true, skipped: "no_text_or_phone" });

    const norm = normalize(text);
    const matched = OPT_OUT_KEYWORDS.some(
      (kw) => norm === kw || norm === `"${kw}"` || norm.startsWith(`${kw} `) || norm.endsWith(` ${kw}`),
    );

    if (!matched) return json({ ok: true, skipped: "no_match" });

    // Normalize BR phone: strip leading 55 for storage variants
    const local = phone.startsWith("55") ? phone.slice(2) : phone;
    const variants = Array.from(new Set([phone, local, `55${local}`]));

    // Find matching user by phone (best effort)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, phone")
      .limit(1000);
    const matchedProfile = profiles?.find((p: any) => {
      const d = (p.phone || "").replace(/\D/g, "");
      return variants.includes(d);
    });

    // Insert unsubscribe (ignore duplicate)
    const { error: insErr } = await supabase.from("promo_unsubscribes").insert({
      phone: `55${local}`,
      user_id: matchedProfile?.user_id ?? null,
    });
    if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
      console.error("unsubscribe insert error:", insErr);
    }

    // Send confirmation reply (best effort)
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

    const { data: site } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "business_name")
      .maybeSingle();
    const businessName = site?.value || "Rosa de Lis Estética";

    if (
      cfg.evolution_enabled === "true" &&
      cfg.evolution_api_url &&
      cfg.evolution_api_key &&
      cfg.evolution_instance_name
    ) {
      const apiUrl = cfg.evolution_api_url.replace(/\/+$/, "");
      const reply = `✅ Você foi removido(a) da nossa lista de promoções.\n\nVocê não receberá mais mensagens promocionais da *${businessName}*.\n\nSe quiser voltar a receber, é só nos avisar. 💕`;
      try {
        await fetch(`${apiUrl}/message/sendText/${cfg.evolution_instance_name}`, {
          method: "POST",
          headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" },
          body: JSON.stringify({ number: `55${local}`, text: reply }),
        });
      } catch (e) {
        console.error("reply send error:", e);
      }
    }

    return json({ ok: true, unsubscribed: `55${local}`, matched_keyword: true });
  } catch (e) {
    console.error("evolution-webhook error:", e);
    // Always return 200 so Evolution doesn't retry infinitely
    return json({ ok: true, error: e instanceof Error ? e.message : "internal" });
  }
});
