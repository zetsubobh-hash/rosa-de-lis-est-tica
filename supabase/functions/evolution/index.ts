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

const readJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const normalizeQrPayload = (payload: any) => {
  const qr =
    payload?.qrcode ||
    payload?.qrCode ||
    payload?.qr ||
    payload?.data?.qrcode ||
    payload?.data?.qrCode ||
    payload?.instance?.qrcode;

  const base64 =
    payload?.base64 ||
    payload?.data?.base64 ||
    qr?.base64 ||
    qr?.image ||
    qr?.qrCode;

  const code =
    payload?.code ||
    payload?.data?.code ||
    qr?.code ||
    qr?.pairingCode ||
    payload?.pairingCode;

  if (!base64 && !code) return payload;

  return {
    ...payload,
    base64,
    code,
    qrcode: {
      ...(qr || {}),
      base64,
      code,
    },
  };
};

const freshQr = async (baseUrl: string, name: string, headers: Record<string, string>) => {
  const enc = encodeURIComponent(name);
  const connect = async () => {
    const r = await fetch(`${baseUrl}/instance/connect/${enc}`, { method: "GET", headers });
    return { ok: r.ok, status: r.status, data: normalizeQrPayload(await readJson(r)) };
  };
  let res = await connect();
  if (res.ok && hasQr(res.data)) return res;
  // Stale "open"/"connecting" session without QR: log out and request a new QR
  console.log("No QR returned, forcing logout and reconnect", res.status);
  await fetch(`${baseUrl}/instance/logout/${enc}`, { method: "DELETE", headers }).catch(() => null);
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await connect();
    if (res.ok && hasQr(res.data)) return res;
  }
  return res;
};

const hasQr = (payload: any) => Boolean(payload?.base64 || payload?.code || payload?.qrcode?.base64 || payload?.qrcode?.code);

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

    const { action, phone, message } = await req.json();
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
      const data = await readJson(res);
      if (!res.ok) {
        console.error("Evolution create_instance error:", res.status);
        const msg = JSON.stringify(data).toLowerCase();
        if ([400, 403, 409].includes(res.status) && (msg.includes("already") || msg.includes("exist") || msg.includes("em uso") || msg.includes("in use"))) {
          console.log("Instance already exists, restarting and fetching QR code...");

          const r = await freshQr(baseUrl, instanceName, headers);
          const qrData = r.data;
          if (!r.ok) {
            return json({ error: qrData?.message || "Erro ao conectar instância existente", details: qrData }, r.status);
          }
          return json({ ...qrData, reused: true });
        }
        return json({ error: data?.message || "Erro ao criar instância" }, res.status);
      }
      return json(normalizeQrPayload(data));
    }

    // Get QR code
    if (action === "get_qrcode") {
      const r = await freshQr(baseUrl, instanceName, headers);
      const data = r.data;
      if (!r.ok) {
        console.error("Evolution get_qrcode error:", r.status);
        return json({ error: data?.message || "Erro ao obter QR Code" }, r.status);
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
        console.error("Evolution check_status error:", res.status);
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

    // Point Evolution webhook to the booking bot
    if (action === "set_bot_webhook") {
      const { data: tok } = await supabase.from("payment_settings").select("value").eq("key", "whatsapp_bot_webhook_token").maybeSingle();
      if (!tok?.value) return json({ error: "Token do robô ausente" }, 400);
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-bot?token=${tok.value}`;
      const res = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: false, events: ["MESSAGES_UPSERT"] },
          enabled: true, url: webhookUrl, webhookByEvents: false, events: ["MESSAGES_UPSERT"],
        }),
      });
      const data = await readJson(res);
      return json({ success: res.ok, status: res.status, data }, res.ok ? 200 : 400);
    }

    // Send test message
    if (action === "send_test") {
      if (!phone) return json({ error: "Informe o número de telefone" }, 400);

      // Fetch business name from site_settings
      const { data: siteSettingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "business_name")
        .maybeSingle();
      const businessName = siteSettingsData?.value || "Rosa de Lis Estética";

      // Use custom message if provided, otherwise fallback to default
      const template = message || "Olá, aqui é da *{empresa}*! ✅\n\nOlá {nome}! Seu agendamento de *{servico}* foi confirmado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕";
      const testMsg = template
        .replace(/\{nome\}/g, "Maria Silva")
        .replace(/\{servico\}/g, "Limpeza de Pele")
        .replace(/\{data\}/g, "20/02/2026")
        .replace(/\{hora\}/g, "14:00")
        .replace(/\{empresa\}/g, businessName);

      const formatted = phone.replace(/\D/g, "");
      const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: formatted,
          text: testMsg,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Evolution send_test error:", res.status);
        return json({ error: data?.message || "Erro ao enviar mensagem de teste" }, res.status);
      }
      return json({ success: true, data });
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
