import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { canReadConversations, messageRecord, messageRecords, readMedia, EvolutionRequestError } from "./helpers.ts";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("chats"), search: z.string().max(100).default(""), page: z.number().int().min(1).max(100000).default(1) }),
  z.object({ action: z.literal("messages"), jid: z.string().regex(/^[\w.+:-]+@(s\.whatsapp\.net|g\.us|lid|broadcast)$/).max(160), page: z.number().int().min(1).max(100000).default(1) }),
  z.object({ action: z.literal("media"), jid: z.string().regex(/^[\w.+:-]+@(s\.whatsapp\.net|g\.us|lid|broadcast)$/).max(160), id: z.string().min(1).max(200) }),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Serviço indisponível" }, 503);
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Entre novamente" }, 401);
    const { data: { user }, error: authError } = await createClient(url, anon).auth.getUser(auth.slice(7));
    if (authError || !user) return json({ error: "Entre novamente" }, 401);
    const db = createClient(url, service);
    const { data: roles, error: roleError } = await db.from("user_roles").select("role").eq("user_id", user.id);
    if (roleError || !canReadConversations(user.id, (roles || []).map(r => r.role))) {
      return json({ error: "Área exclusiva do administrador Walliston" }, 403);
    }
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Solicitação inválida" }, 400);
    const input = parsed.data;
    const { data: settings, error: configError } = await db.from("payment_settings").select("key,value")
      .in("key", ["evolution_api_url", "evolution_api_key", "evolution_instance_name"]);
    if (configError) return json({ error: "Não foi possível ler a conexão" }, 503);
    const cfg = Object.fromEntries((settings || []).map(r => [r.key, r.value]));
    if (!cfg.evolution_api_url || !cfg.evolution_api_key || !cfg.evolution_instance_name) return json({ error: "Configure o número na aba WhatsApp" }, 400);
    const base = cfg.evolution_api_url.replace(/\/+$/, "");
    const instance = encodeURIComponent(cfg.evolution_instance_name);
    const call = async (path: string, body: object) => {
      const response = await fetch(`${base}/${path}/${instance}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
        headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) {
        // Do not log conversation content, credentials or raw provider payloads.
        console.error("Evolution conversations request failed", path, response.status);
        throw new EvolutionRequestError(response.status);
      }
      try { return JSON.parse(text); } catch { throw new Error("Resposta inválida do Evolution"); }
    };
    if (input.action === "chats") {
      const payload = await call("chat/findChats", {});
      const raw = Array.isArray(payload) ? payload : payload?.chats || payload?.data;
      if (!Array.isArray(raw)) throw new Error("O Evolution não retornou uma lista de conversas compatível");
      const search = input.search.toLocaleLowerCase("pt-BR");
      const chats = raw.map((c: any) => ({
        jid: String(c.remoteJid || c.id || ""),
        name: String(c.name || c.pushName || c.lastMessage?.pushName || c.remoteJid?.split("@")[0] || "Conversa"),
        unread: Number(c.unreadMessages || c.unreadCount) || 0,
        last: c.lastMessage ? messageRecord(c.lastMessage) : null,
      })).filter(c => c.jid && `${c.name} ${c.jid}`.toLocaleLowerCase("pt-BR").includes(search))
        .sort((a, b) => (b.last?.timestamp || 0) - (a.last?.timestamp || 0));
      return json({ chats: chats.slice((input.page - 1) * 50, input.page * 50), total: chats.length, pages: Math.max(1, Math.ceil(chats.length / 50)), instance: cfg.evolution_instance_name });
    }
    const payload = await call("chat/findMessages", {
      where: { key: { remoteJid: input.jid, ...(input.action === "media" ? { id: input.id } : {}) } },
      page: input.action === "messages" ? input.page : 1, offset: input.action === "messages" ? 50 : 1,
    });
    const records = messageRecords(payload);
    if (input.action === "messages") {
      const messages = records.map(messageRecord).sort((a, b) => a.timestamp - b.timestamp);
      return json({ messages, hasMore: payload.messages?.pages ? input.page < payload.messages.pages : records.length === 50 });
    }
    const record = records.find(r => r.key?.id === input.id && r.key?.remoteJid === input.jid);
    if (!record) return json({ error: "Mensagem não encontrada nesta conversa" }, 404);
    const normalized = messageRecord(record);
    if (!["audio", "image", "video", "sticker", "document"].includes(normalized.kind)) return json({ error: "Esta mensagem não contém um arquivo" }, 400);
    const media = await readMedia(record, body => call("chat/getBase64FromMediaMessage", body));
    if (!media) return json({ available: false, error: "O WhatsApp não disponibilizou este arquivo. Mídias antigas podem ter expirado; peça o reenvio para abrir aqui." });
    const mime = String(media.mimetype || media.mimeType || "").split(";")[0];
    const allowedMime = normalized.kind === "image" || normalized.kind === "sticker" ? /^image\/(jpeg|png|webp|gif)$/
      : normalized.kind === "video" ? /^video\/(mp4|webm|quicktime)$/
      : normalized.kind === "document" ? /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-(excel|powerpoint))|text\/plain)$/
      : /^audio\/(ogg|mpeg|mp4|aac|wav|webm|opus)$/;
    const base64 = String(media.base64 || "").replace(/^data:[^;]+;base64,/, "");
    if (!allowedMime.test(mime) || !base64 || !/^[A-Za-z0-9+/=\r\n]+$/.test(base64)) return json({ error: "Mídia indisponível ou formato não suportado" }, 422);
    if (base64.length > 28_000_000) return json({ error: "Arquivo muito grande para abrir no painel" }, 413);
    return json({ available: true, mime, base64 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível abrir as conversas" }, 502);
  }
});