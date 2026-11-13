import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { conversationRequestSchema } from "./requestSchema.ts";
import { canReadConversations, messageRecord, messageRecords, readMedia, EvolutionRequestError, conversationRecord, mergeConversation, collectionRecords, hasNextMessagePage } from "./helpers.ts";

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
    const parsed = conversationRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map(issue => issue.path.join(".") || "action"))];
      // Log only field names, never conversation identifiers or message content.
      console.warn("Evolution conversations invalid request fields", fields.join(","));
      return json({ error: `Solicitação inválida: confira ${fields.join(", ")}. Atualize a página e tente novamente.` }, 400);
    }
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
    const archiveInstance = `${base}|${cfg.evolution_instance_name}`;
    const saveChats = async (raw: any[], isMessage = false) => {
      const merged = new Map<string, NonNullable<ReturnType<typeof conversationRecord>>>();
      for (const item of raw) {
        const chat = conversationRecord(item, isMessage);
        if (chat) merged.set(chat.jid, mergeConversation(chat, merged.get(chat.jid)));
      }
      const entries = [...merged.values()];
      for (let start = 0; start < entries.length; start += 200) {
        const batch = entries.slice(start, start + 200);
        const { data: existing, error: readError } = await db.from("evolution_chat_archive").select("*")
          .eq("instance", archiveInstance).in("jid", batch.map(c => c.jid));
        if (readError) throw new Error("Não foi possível consultar o arquivo de conversas");
        const previous = new Map((existing || []).map(c => [c.jid, c]));
        const { error } = await db.from("evolution_chat_archive").upsert(batch.map(c => ({
          ...mergeConversation(c, previous.get(c.jid)), instance: archiveInstance,
        })), { onConflict: "instance,jid" });
        if (error) throw new Error("Não foi possível salvar as conversas");
      }
    };
    const saveMessages = async (raw: any[]) => {
      const rows = new Map<string, any>();
      for (const record of raw) {
        const chat = conversationRecord(record, true);
        const content = messageRecord(record);
        if (!chat || !content.id) continue;
        rows.set(`${chat.jid}|${content.id}`, { instance: archiveInstance, jid: chat.jid,
          message_id: content.id, content, message_timestamp: content.timestamp });
      }
      if (rows.size) {
        const { error } = await db.from("evolution_message_archive").upsert([...rows.values()], { onConflict: "instance,jid,message_id" });
        if (error) throw new Error("Não foi possível salvar as mensagens");
      }
      await saveChats(raw, true);
      return rows.size;
    };
    if (input.action === "sync") {
      let warning = "";
      if (input.page === 1) {
        try { await saveChats(collectionRecords(await call("chat/findChats", {}), "chats")); }
        catch (e) { if (!(e instanceof EvolutionRequestError)) throw e; warning = "Lista de chats indisponível; buscando pelo histórico de mensagens."; }
      }
      // Global history discovers chats absent from findChats. Each request saves one page
      // so large histories do not hit the function execution timeout.
      const payload = await call("chat/findMessages", { where: {}, page: input.page, offset: 200 });
      const saved = await saveMessages(messageRecords(payload));
      const hasMore = hasNextMessagePage(payload, input.page, 200);
      if (!hasMore) {
        // Contact data may contain the real phone mapped to a WhatsApp LID.
        try { await saveChats(collectionRecords(await call("chat/findContacts", { where: {} }), "contacts")); }
        catch (e) { if (!(e instanceof EvolutionRequestError)) throw e; warning = "Alguns contatos não informaram o celular; os identificadores privados não serão exibidos como números."; }
      }
      return json({ saved, hasMore, nextPage: input.page + 1, warning });
    }
    if (input.action === "chats") {
      let query = db.from("evolution_chat_archive").select("*", { count: "exact" }).eq("instance", archiveInstance);
      const term = input.search.trim().replace(/[%_*,().\\]/g, " ").trim();
      const digits = input.search.replace(/\D/g, "");
      if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${digits || term}%`);
      const { data, count, error } = await query.order("last_timestamp", { ascending: false }).order("jid")
        .range((input.page - 1) * 50, input.page * 50 - 1);
      if (error) throw new Error("Não foi possível abrir as conversas salvas");
      return json({ chats: (data || []).map(c => ({ jid: c.jid, name: c.name, phone: c.phone, unread: c.unread, last: c.last_message })),
        total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / 50)), instance: cfg.evolution_instance_name });
    }
    if (input.action === "messages") {
      const { data, count, error } = await db.from("evolution_message_archive").select("content", { count: "exact" })
        .eq("instance", archiveInstance).eq("jid", input.jid).order("message_timestamp", { ascending: false }).order("message_id")
        .range((input.page - 1) * 50, input.page * 50 - 1);
      if (error) throw new Error("Não foi possível abrir as mensagens salvas");
      return json({ messages: (data || []).map(r => r.content).sort((a: any, b: any) => a.timestamp - b.timestamp), hasMore: input.page * 50 < (count || 0) });
    }
    const payload = await call("chat/findMessages", {
      where: { key: { remoteJid: input.jid, ...(input.action === "media" ? { id: input.id } : {}) } },
      page: 1, offset: 1,
    });
    const records = messageRecords(payload);
    const record = records.find(r => r.key?.id === input.id && r.key?.remoteJid === input.jid);
    if (!record) return json({ error: "Mensagem não encontrada nesta conversa" }, 404);
    const normalized = messageRecord(record);
    if (!["audio", "image", "video", "sticker", "document"].includes(normalized.kind)) return json({ error: "Esta mensagem não contém um arquivo" }, 400);
    const media = await readMedia(record, body => call("chat/getBase64FromMediaMessage", body));
    if (!media) return json({ available: false, error: "O WhatsApp não disponibilizou este arquivo. Mídias antigas podem ter expirado; peça o reenvio para abrir aqui." });
    const mime = String(media.mimetype || media.mimeType || "").split(";")[0].trim().toLowerCase();
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