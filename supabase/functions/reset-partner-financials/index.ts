import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée" });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key || !serviceKey) return reply(500, { error: "Serviço indisponível" });
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Entre novamente" });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await client.auth.getUser(authorization.slice(7));
    if (userError || !user?.email) return reply(401, { error: "Entre novamente" });
    const service = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: role, error: roleError } = await service.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role) return reply(403, { error: "Acesso restrito ao administrador" });
    const { partner_id, password } = await req.json();
    if (typeof partner_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partner_id) || typeof password !== "string" || !password) return reply(400, { error: "Informe o parceiro e a senha" });
    const { data: verified, error: passwordError } = await client.auth.signInWithPassword({ email: user.email, password });
    if (passwordError || verified.user?.id !== user.id) return reply(403, { error: "Senha do administrador incorreta" });
    const { data, error } = await service.rpc("reset_partner_financials", { _partner_id: partner_id, _admin_id: user.id });
    if (error) return reply(500, { error: "Não foi possível limpar os dados financeiros" });
    return reply(200, data);
  } catch {
    return reply(500, { error: "Não foi possível concluir a limpeza" });
  }
});