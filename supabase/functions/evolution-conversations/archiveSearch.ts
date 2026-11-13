import { messageSearchPattern } from "./helpers.ts";

// Call only after the shared JWT/account/role authorization in index.ts.
export async function searchArchivedMessages(db: any, instance: string, search: string, page: number) {
  const pattern = messageSearchPattern(search);
  if (!pattern) return { results: [], total: 0, pages: 1 };
  const { data, count, error } = await db.from("evolution_message_archive")
    .select("jid,content", { count: "exact" }).eq("instance", instance)
    .ilike("search_text", pattern).order("message_timestamp", { ascending: false }).order("jid").order("message_id")
    .range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Não foi possível buscar no histórico salvo");
  const jids = [...new Set((data || []).map((row: any) => row.jid))];
  const contacts = jids.length ? await db.from("evolution_chat_archive")
    .select("jid,name,phone,unread").eq("instance", instance).in("jid", jids) : { data: [], error: null };
  if (contacts.error) throw new Error("Não foi possível identificar os contatos encontrados");
  const chats = new Map((contacts.data || []).map((chat: any) => [chat.jid, chat]));
  return {
    results: (data || []).map((row: any) => ({ message: row.content,
      chat: chats.get(row.jid) || { jid: row.jid, name: "Contato sem nome", phone: null, unread: 0 } })),
    total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / 50)),
  };
}