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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    ).auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Acesso negado" }, 403);

    const { action, instance_id } = await req.json();
    if (!instance_id) return json({ error: "instance_id required" }, 400);

    // Fetch instance from DB
    const { data: inst, error: instErr } = await supabase
      .from("evolution_instances")
      .select("*")
      .eq("id", instance_id)
      .single();
    if (instErr || !inst) return json({ error: "Instância não encontrada" }, 404);

    const baseUrl = inst.api_url.replace(/\/+$/, "");
    const headers = { apikey: inst.api_key, "Content-Type": "application/json" };
    const instanceName = inst.instance_name;

    if (action === "create_instance") {
      const res = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = JSON.stringify(data).toLowerCase();
        if (res.status === 403 && msg.includes("already in use")) {
          try {
            await fetch(`${baseUrl}/instance/restart/${instanceName}`, { method: "PUT", headers });
          } catch (_e) { /* ignore */ }
          await new Promise((r) => setTimeout(r, 1500));
          const qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { method: "GET", headers });
          const qrData = await qrRes.json();
          if (!qrRes.ok) return json({ error: qrData?.message || "Erro ao conectar instância existente" }, qrRes.status);
          return json({ ...qrData, reused: true });
        }
        return json({ error: data?.message || "Erro ao criar instância" }, res.status);
      }
      return json(data);
    }

    if (action === "get_qrcode") {
      const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Erro ao buscar QR Code" }, res.status);
      return json(data);
    }

    if (action === "check_status") {
      const res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { method: "GET", headers });
      const data = await res.json();
      if (!res.ok) return json({ error: data?.message || "Erro ao verificar status" }, res.status);
      return json(data);
    }

    if (action === "logout") {
      const res = await fetch(`${baseUrl}/instance/logout/${instanceName}`, { method: "DELETE", headers });
      const data = await res.json();
      return json(data);
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: any) {
    console.error("evolution-instance error:", err);
    return json({ error: err.message }, 500);
  }
});
