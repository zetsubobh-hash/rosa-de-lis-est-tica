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

async function getConfig(supabase: any) {
  const { data } = await supabase
    .from("payment_settings")
    .select("key, value")
    .in("key", [
      "evolution_api_url",
      "evolution_api_key",
      "evolution_instance_name",
      "evolution_enabled",
    ]);
  const map: Record<string, string> = {};
  data?.forEach((r: any) => {
    map[r.key] = r.value;
  });
  return map;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify user is admin
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();

    if (!user) return json({ error: "Não autorizado" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Acesso negado" }, 403);

    const { action } = await req.json();
    const config = await getConfig(supabase);

    // Save settings action
    if (action === "save_settings") {
      return json({ success: true });
    }

    // Check if Evolution is configured
    const apiUrl = config.evolution_api_url;
    const apiKey = config.evolution_api_key;
    const instanceName = config.evolution_instance_name;

    if (!apiUrl || !apiKey || !instanceName) {
      return json({ error: "Evolution API não configurada" }, 400);
    }

    const baseUrl = apiUrl.replace(/\/+$/, "");
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    // Create instance
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
        console.error("Evolution create_instance error:", res.status, data);
        return json({ error: data?.message || "Erro ao criar instância" }, res.status);
      }
      return json(data);
    }

    // Get QR code
    if (action === "get_qrcode") {
      const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Evolution get_qrcode error:", res.status, data);
        return json({ error: data?.message || "Erro ao obter QR Code" }, res.status);
      }
      return json(data);
    }

    // Check connection status
    if (action === "check_status") {
      const res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
        method: "GET",
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Evolution check_status error:", res.status, data);
        return json({ error: data?.message || "Erro ao verificar status" }, res.status);
      }
      return json(data);
    }

    // Logout / disconnect
    if (action === "logout") {
      const res = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      return json(data);
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("evolution error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Erro interno" },
      500
    );
  }
});
