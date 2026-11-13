import { conversationRequestSchema } from "./requestSchema.ts";

Deno.test("sync request sent by the archive screen is valid", () => {
  const parsed = conversationRequestSchema.safeParse({ action: "sync", page: 1 });
  if (!parsed.success) throw new Error("Archive synchronization request rejected");
});

Deno.test("chat, message and media requests accept provider identifiers", () => {
  const requests = [
    { action: "chats", search: "", page: 1 },
    { action: "global_search", search: "horário", page: 2 },
    { action: "messages", jid: "123456789012345@lid", page: 1 },
    { action: "messages", jid: "123456789012345@lid", page: 1, search: "horário" },
    { action: "media", jid: "120363174409575009@g.us", id: "AC5B7AEBDFC7D931D9E7235982862679" },
  ];
  for (const request of requests) {
    if (!conversationRequestSchema.safeParse(request).success) throw new Error(`Rejected ${request.action}`);
  }
});

Deno.test("invalid media identifiers and nonfinite page numbers remain rejected", () => {
  if (conversationRequestSchema.safeParse({ action: "media", jid: "invalid", id: "" }).success) throw new Error("Invalid media accepted");
  if (conversationRequestSchema.safeParse({ action: "sync", page: NaN }).success) throw new Error("Invalid page accepted");
  if (conversationRequestSchema.safeParse({ action: "messages", jid: "5511999999999@s.whatsapp.net", page: 1, search: "x".repeat(101) }).success) throw new Error("Oversized conversation search accepted");
  if (conversationRequestSchema.safeParse({ action: "global_search", search: "x".repeat(101), page: 1 }).success) throw new Error("Oversized global search accepted");
});