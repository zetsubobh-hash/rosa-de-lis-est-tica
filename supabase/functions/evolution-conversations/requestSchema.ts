import { z } from "npm:zod@3";

const page = z.number().int().min(1).max(100000).default(1);
const jid = z.string().regex(/^[\w.+:-]+@(s\.whatsapp\.net|g\.us|lid|broadcast)$/).max(160);
export const conversationRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync"), page }),
  z.object({ action: z.literal("chats"), search: z.string().max(100).default(""), page }),
  z.object({ action: z.literal("global_search"), search: z.string().min(1).max(100), page }),
  z.object({ action: z.literal("messages"), jid, page, search: z.string().max(100).default("") }),
  z.object({ action: z.literal("media"), jid, id: z.string().min(1).max(200) }),
]);