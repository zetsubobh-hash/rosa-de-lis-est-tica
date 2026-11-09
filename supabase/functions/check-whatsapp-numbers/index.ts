import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Admin-only: asks the active Evolution instance which numbers have WhatsApp.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Somente administrador" }, 403);

    const body = await req.json().catch(() => ({}));
    const numbers: string[] = Array.isArray(body?.numbers)
      ? body.numbers.map((n: unknown) => String(n).replace(/\D/g, "")).filter((n: string) => n.length >= 10 && n.length <= 13).slice(0, 50)
      : [];
    if (numbers.length === 0) return json({ error: "Nenhum número válido" }, 400);

    const { data: inst } = await supabase.from("evolution_instances").select("*").eq("is_active", true).order("sort_order").limit(1).maybeSingle();
    if (!inst) return json({ error: "Nenhuma instância de WhatsApp ativa" }, 400);

    const res = await fetch(`${inst.api_url.replace(/\/$/, "")}/chat/whatsappNumbers/${inst.instance_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: inst.api_key },
      body: JSON.stringify({ numbers }),
    });
    const text = await res.text();
    if (!res.ok) return json({ error: `WhatsApp respondeu ${res.status}`, details: text.slice(0, 300) }, 502);
    const list = JSON.parse(text);
    const exists: Record<string, boolean> = {};
    for (const n of numbers) exists[n] = false;
    for (const r of Array.isArray(list) ? list : []) {
      const num = String(r.number ?? r.jid ?? "").replace(/\D/g, "");
      const match = numbers.find((n) => num === n || num.endsWith(n.slice(-8)) && num.slice(0, 4) === n.slice(0, 4));
      if (match) exists[match] = !!r.exists;
    }
    return json({ exists });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
