// WhatsApp booking bot: receives Evolution API webhooks, answers with AI and books appointments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SLOTS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
const WEEK = ["dom","seg","ter","qua","qui","sex","sab"];
const HUMAN_WORDS = /\b(atendente|humano|pessoa|recepç|recepc)/i;
const maskPhone = (p: string) => p.replace(/\d(?=\d{4})/g, "*");

const brNow = () => new Date(Date.now() - 3 * 3600_000);
const todayStr = () => brNow().toISOString().slice(0, 10);

const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (m) => m.toUpperCase());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: rows } = await supabase.from("payment_settings").select("key,value").in("key", [
      "whatsapp_bot_enabled","whatsapp_bot_name","whatsapp_bot_webhook_token",
      "evolution_api_url","evolution_api_key","evolution_instance_name",
    ]);
    const cfg: Record<string, string> = {};
    rows?.forEach((r: any) => (cfg[r.key] = r.value));

    const url = new URL(req.url);
    if (!cfg.whatsapp_bot_webhook_token || url.searchParams.get("token") !== cfg.whatsapp_bot_webhook_token) {
      return json({ error: "Não autorizado" }, 401);
    }
    if (cfg.whatsapp_bot_enabled !== "true") return json({ skipped: "bot desligado" });

    const body = await req.json().catch(() => ({}));
    const event = String(body?.event || "").toLowerCase().replace("_", ".");
    if (event && event !== "messages.upsert") return json({ skipped: "evento ignorado" });
    const msg = Array.isArray(body?.data) ? body.data[0] : body?.data;
    const jid: string = msg?.key?.remoteJid || "";
    if (!msg || msg?.key?.fromMe || !jid.endsWith("@s.whatsapp.net")) return json({ skipped: "não é mensagem de cliente" });
    const text: string = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
    if (!text) return json({ skipped: "sem texto" });
    const phone = jid.split("@")[0].replace(/\D/g, "");
    const local = phone.startsWith("55") ? phone.slice(2) : phone;

    const apiUrl = cfg.evolution_api_url?.replace(/\/+$/, "");
    const send = async (t: string) => {
      if (!apiUrl || !cfg.evolution_api_key || !cfg.evolution_instance_name) return;
      await fetch(`${apiUrl}/message/sendText/${cfg.evolution_instance_name}`, {
        method: "POST",
        headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" },
        body: JSON.stringify({ number: phone, text: t }),
      }).catch((e) => console.error("send failed", maskPhone(phone), e));
    };

    // Session
    const { data: sess } = await supabase.from("whatsapp_bot_sessions").select("*").eq("phone", phone).maybeSingle();
    const stale = sess && Date.now() - new Date(sess.updated_at).getTime() > 6 * 3600_000;
    let history: any[] = stale ? [] : (sess?.history ?? []);
    let handedOff = stale ? false : !!sess?.handed_off;
    if (handedOff) {
      if (/^(robo|robô|lis|menu|voltar)$/i.test(text)) handedOff = false;
      else {
        await supabase.from("whatsapp_bot_sessions").upsert({ phone, history, handed_off: true });
        return json({ skipped: "atendimento humano" });
      }
    }

    // Client lookup by phone (last 10/11 digits)
    const tail = local.slice(-8);
    const { data: candidates } = await supabase.from("profiles").select("user_id, full_name, phone").ilike("phone", `%${tail.slice(0,4)}%${tail.slice(4)}%`).limit(20);
    let client = (candidates || []).find((p: any) => {
      const d = String(p.phone || "").replace(/\D/g, "");
      const dl = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
      return dl === local || dl.slice(-8) === tail && dl.slice(0, 2) === local.slice(0, 2);
    }) || null;

    const botName = cfg.whatsapp_bot_name || "Lis";
    const { data: biz } = await supabase.from("site_settings").select("value").eq("key", "business_name").maybeSingle();
    const business = biz?.value || "Rosa de Lis Estética";

    if (HUMAN_WORDS.test(text)) {
      await send(`Claro! Vou chamar alguém da nossa equipe para continuar com você 💖 Em instantes uma pessoa responde por aqui. Se quiser falar comigo de novo, é só escrever *${botName}*.`);
      await supabase.from("whatsapp_bot_sessions").upsert({ phone, user_id: client?.user_id ?? null, history, handed_off: true });
      return json({ ok: true, handoff: true });
    }

    // ---- Tools ----
    const tools = [
      { type: "function", function: { name: "listar_servicos", description: "Lista todos os serviços ativos da clínica com preço e duração.", parameters: { type: "object", properties: {} } } },
      { type: "function", function: { name: "horarios_livres", description: "Horários livres em uma data para um serviço.", parameters: { type: "object", properties: { data: { type: "string", description: "YYYY-MM-DD" }, service_slug: { type: "string" } }, required: ["data", "service_slug"] } } },
      { type: "function", function: { name: "cadastrar_cliente", description: "Cadastra a cliente pelo nome completo quando ela ainda não tem cadastro.", parameters: { type: "object", properties: { nome: { type: "string" } }, required: ["nome"] } } },
      { type: "function", function: { name: "agendar", description: "Cria o agendamento depois que a cliente confirmou serviço, data e hora.", parameters: { type: "object", properties: { service_slug: { type: "string" }, data: { type: "string" }, hora: { type: "string" } }, required: ["service_slug", "data", "hora"] } } },
      { type: "function", function: { name: "meus_agendamentos", description: "Lista os próximos agendamentos da cliente.", parameters: { type: "object", properties: {} } } },
      { type: "function", function: { name: "chamar_atendente", description: "Passa a conversa para uma pessoa da equipe.", parameters: { type: "object", properties: {} } } },
    ];

    const getServices = async () => {
      const { data } = await supabase.from("services").select("slug,title,duration,price_label,short_description").eq("is_active", true).order("sort_order");
      return data || [];
    };

    const freeSlots = async (date: string, slug: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { erro: "data inválida" };
      if (date < todayStr()) return { erro: "data no passado" };
      const wd = WEEK[new Date(`${date}T12:00:00Z`).getUTCDay()];
      const { data: ps } = await supabase.from("partner_services").select("partner_id").eq("service_slug", slug);
      const ids = (ps || []).map((p: any) => p.partner_id);
      let q = supabase.from("partners").select("id,full_name,work_days,work_start,work_end").eq("is_active", true);
      if (ids.length) q = q.in("id", ids);
      const { data: partners } = await q;
      const working = (partners || []).filter((p: any) => (p.work_days || []).includes(wd));
      const { data: appts } = await supabase.from("appointments").select("appointment_time,partner_id").eq("appointment_date", date).in("status", ["confirmed", "pending"]);
      const { data: rooms } = await supabase.rpc("treatment_rooms_count");
      const roomCount = Number(rooms) || 1;
      const now = brNow();
      const nowHM = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
      const result: { hora: string; partner_id: string | null; profissional: string | null }[] = [];
      for (const s of SLOTS) {
        if (date === todayStr() && s <= nowHM) continue;
        const atSlot = (appts || []).filter((a: any) => a.appointment_time === s);
        if (atSlot.length >= roomCount) continue;
        if (working.length === 0 && (partners || []).length === 0) { result.push({ hora: s, partner_id: null, profissional: null }); continue; }
        const p = working.find((w: any) => s >= (w.work_start || "00:00") && s < (w.work_end || "23:59") && !atSlot.some((a: any) => a.partner_id === w.id));
        if (p) result.push({ hora: s, partner_id: p.id, profissional: p.full_name });
      }
      return { data: date, dia_semana: wd, horarios: result.map((r) => `${r.hora}${r.profissional ? ` (${r.profissional})` : ""}`), _raw: result };
    };

    const runTool = async (name: string, args: any): Promise<any> => {
      if (name === "listar_servicos") return await getServices();
      if (name === "horarios_livres") { const r: any = await freeSlots(args.data, args.service_slug); delete r._raw; return r; }
      if (name === "meus_agendamentos") {
        if (!client) return { erro: "cliente sem cadastro" };
        const { data } = await supabase.from("appointments").select("service_title,appointment_date,appointment_time,status").eq("user_id", client.user_id).gte("appointment_date", todayStr()).in("status", ["confirmed", "pending"]).order("appointment_date");
        return data || [];
      }
      if (name === "chamar_atendente") { handedOff = true; return { ok: true }; }
      if (name === "cadastrar_cliente") {
        if (client) return { ok: true, nome: client.full_name };
        const nome = titleCase(String(args.nome || "")).slice(0, 80);
        if (nome.length < 3) return { erro: "nome inválido" };
        const base = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "cliente";
        const username = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
        const { data: u, error } = await supabase.auth.admin.createUser({
          email: `${crypto.randomUUID()}@rosadelis.internal`, password: crypto.randomUUID().slice(0, 12), email_confirm: true,
          user_metadata: { full_name: nome, username },
        });
        if (error || !u?.user) return { erro: "não foi possível cadastrar" };
        const { error: pe } = await supabase.from("profiles").insert({ user_id: u.user.id, full_name: nome, username, phone: local });
        if (pe) { await supabase.auth.admin.deleteUser(u.user.id); return { erro: "não foi possível cadastrar" }; }
        client = { user_id: u.user.id, full_name: nome, phone: local };
        return { ok: true, nome };
      }
      if (name === "agendar") {
        if (!client) return { erro: "Peça o nome completo e use cadastrar_cliente antes." };
        const svc = (await getServices()).find((s: any) => s.slug === args.service_slug);
        if (!svc) return { erro: "serviço não encontrado" };
        const r: any = await freeSlots(args.data, args.service_slug);
        if (r.erro) return r;
        const slot = r._raw.find((x: any) => x.hora === args.hora);
        if (!slot) return { erro: "horário indisponível", livres: r.horarios };
        const { error } = await supabase.from("appointments").insert({
          user_id: client.user_id, service_slug: svc.slug, service_title: svc.title,
          appointment_date: args.data, appointment_time: args.hora, status: "confirmed",
          partner_id: slot.partner_id, notes: `Agendado pelo robô ${botName} via WhatsApp`,
        });
        if (error) return { erro: "horário acabou de ser ocupado, ofereça outro" };
        return { ok: true, servico: svc.title, data: args.data, hora: args.hora, profissional: slot.profissional };
      }
      return { erro: "ferramenta desconhecida" };
    };

    const system = `Você é ${botName}, assistente virtual (robô) da ${business}, clínica de estética.
Na PRIMEIRA mensagem da conversa, apresente-se: diga seu nome e avise com naturalidade que é um atendimento automático feito por robô, e que a cliente pode pedir uma atendente a qualquer momento.
Fale português do Brasil, de forma calorosa, humana e breve (no máximo 4 linhas por mensagem), com poucos emojis delicados 🌸💖. Use *negrito* do WhatsApp.
Hoje é ${todayStr()} (${WEEK[new Date(todayStr() + "T12:00:00Z").getUTCDay()]}), fuso de Brasília.
Cliente: ${client ? `já cadastrada como ${client.full_name}` : "SEM cadastro — antes de agendar, peça o nome completo e chame cadastrar_cliente"}.
Regras: use SEMPRE as ferramentas para serviços e horários; nunca invente preços, serviços ou horários. Ofereça no máximo 5 horários. Antes de chamar agendar, confirme serviço, data e hora com a cliente. Após agendar, envie um resumo. Para dúvidas médicas, pagamentos, reclamações ou cancelamentos, chame chamar_atendente.`;

    history.push({ role: "user", content: text.slice(0, 1000) });
    const messages: any[] = [{ role: "system", content: system }, ...history.slice(-20)];
    let reply = "";
    for (let i = 0; i < 6; i++) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, tools }),
      });
      if (!r.ok) { console.error("AI error", r.status, await r.text()); break; }
      const m = (await r.json()).choices?.[0]?.message;
      if (!m) break;
      if (m.tool_calls?.length) {
        messages.push(m);
        for (const tc of m.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          const out = await runTool(tc.function.name, args);
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(out) });
        }
        continue;
      }
      reply = (m.content || "").trim();
      break;
    }
    if (!reply) reply = `Desculpe, tive um probleminha agora 😔 Já chamei nossa equipe para te ajudar!`, handedOff = true;
    if (handedOff && !/equipe|atendente/i.test(reply)) reply += `\n\nVou chamar alguém da nossa equipe para continuar com você 💖`;

    history.push({ role: "assistant", content: reply });
    await supabase.from("whatsapp_bot_sessions").upsert({ phone, user_id: client?.user_id ?? null, history: history.slice(-30), handed_off: handedOff });
    await send(reply);
    return json({ ok: true });
  } catch (e) {
    console.error("whatsapp-bot error", e);
    return json({ error: "erro interno" }, 500);
  }
});
