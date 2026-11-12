export const WALLISTON_ID = "4649913b-f48b-470e-b407-251803756157";

export function canReadConversations(userId: string, roles: string[]) {
  return userId === WALLISTON_ID && roles.includes("admin");
}

export function messageRecord(record: any) {
  let content = record.message || {};
  for (let i = 0; i < 3; i++) {
    const wrapped = content.ephemeralMessage?.message || content.viewOnceMessage?.message || content.viewOnceMessageV2?.message;
    if (!wrapped) break;
    content = wrapped;
  }
  const image = content.imageMessage;
  const audio = content.audioMessage;
  return {
    id: String(record.key?.id || record.id || ""),
    fromMe: record.key?.fromMe === true,
    timestamp: Number(record.messageTimestamp) || 0,
    sender: String(record.pushName || ""),
    kind: image ? "image" : audio ? "audio" : "text",
    text: String(content.conversation || content.extendedTextMessage?.text || image?.caption || content.videoMessage?.caption || content.documentMessage?.fileName || (audio ? "" : "[Mensagem não suportada]")),
    seconds: Number(audio?.seconds) || 0,
  };
}

export function messageRecords(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages?.records)) return payload.messages.records;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}