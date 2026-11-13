export const WALLISTON_ID = "4649913b-f48b-470e-b407-251803756157";

export function canReadConversations(userId: string, roles: string[]) {
  return userId === WALLISTON_ID && roles.includes("admin");
}

export function phoneFromRecord(record: any): string | null {
  const candidates = [record.phoneNumber, record.phone, record.remoteJidAlt, record.key?.remoteJidAlt,
    record.lastMessage?.key?.remoteJidAlt, record.remoteJid, record.key?.remoteJid, record.id];
  for (const value of candidates) {
    if (typeof value !== "string" || /@(lid|g\.us|broadcast)$/.test(value)) continue;
    const digits = value.split("@")[0].split(":")[0].replace(/\D/g, "");
    if (/^\d{7,15}$/.test(digits)) return digits;
  }
  return null;
}

export function conversationRecord(record: any, isMessage = false) {
  const jid = String(record.remoteJid || record.key?.remoteJid || record.id || "");
  if (!/^[\w.+:-]+@(s\.whatsapp\.net|g\.us|lid|broadcast)$/.test(jid)) return null;
  const last = isMessage ? messageRecord(record) : record.lastMessage ? messageRecord(record.lastMessage) : null;
  return { jid, name: String(record.name || record.pushName || record.lastMessage?.pushName || ""),
    phone: phoneFromRecord(record), unread: Number(record.unreadMessages || record.unreadCount) || 0,
    last_message: last, last_timestamp: last?.timestamp || 0 };
}

export function mergeConversation(incoming: NonNullable<ReturnType<typeof conversationRecord>>, previous?: any) {
  const latest = incoming.last_timestamp >= Number(previous?.last_timestamp || 0);
  return { ...incoming, name: incoming.name || previous?.name || incoming.phone || "Conversa",
    phone: incoming.phone || previous?.phone || null,
    last_message: latest ? incoming.last_message || previous?.last_message || null : previous.last_message,
    last_timestamp: Math.max(incoming.last_timestamp, Number(previous?.last_timestamp || 0)) };
}

export function hasNextMessagePage(payload: any, page: number, size: number) {
  const pages = Number(payload?.messages?.pages ?? payload?.pages);
  return Number.isFinite(pages) && pages > 0 ? page < pages : messageRecords(payload).length === size;
}

export function collectionRecords(payload: any, key: "chats" | "contacts"): any[] {
  if (Array.isArray(payload)) return payload;
  const data = payload?.[key] ?? payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  throw new Error("O Evolution não retornou uma lista compatível");
}

// Database JSON can serialize protobuf byte fields as Buffers or numeric maps.
// Baileys expects base64 strings when these fields cross the HTTP boundary.
export function mediaRequest(record: any) {
  const byteFields = new Set(["mediaKey", "fileSha256", "fileEncSha256", "jpegThumbnail", "streamingSidecar"]);
  const message = JSON.parse(JSON.stringify(record.message), (key, value) => {
    if (!byteFields.has(key) || !value || typeof value !== "object") return value;
    const bytes = Array.isArray(value) ? value : value.type === "Buffer" && Array.isArray(value.data)
      ? value.data : Object.keys(value).every(k => /^\d+$/.test(k))
        ? Object.keys(value).sort((a, b) => Number(a) - Number(b)).map(k => value[k]) : null;
    if (!bytes || !bytes.every((b: unknown) => typeof b === "number" && Number.isInteger(b) && b >= 0 && b <= 255)) return value;
    return btoa(bytes.map((b: number) => String.fromCharCode(b)).join(""));
  });
  return { message: { key: record.key, message }, convertToMp4: false };
}

export class EvolutionRequestError extends Error {
  constructor(public status: number) {
    super(`Evolution retornou ${status}. Verifique a conexão e o histórico salvo na instância.`);
  }
}

export async function readMedia(record: any, call: (body: object) => Promise<any>) {
  try {
    return await call(mediaRequest(record));
  } catch (error) {
    if (!(error instanceof EvolutionRequestError) || error.status !== 400) throw error;
    // Some versions need to hydrate media from their own database instead.
    try {
      return await call({ message: { key: record.key }, convertToMp4: false });
    } catch (retryError) {
      if (!(retryError instanceof EvolutionRequestError) || retryError.status !== 400) throw retryError;
      return null;
    }
  }
}

function messageContent(value: any): any {
  if (typeof value === "string") {
    try { return messageContent(JSON.parse(value)); } catch { return { conversation: value }; }
  }
  if (!value || typeof value !== "object") return {};
  let content = value;
  for (let i = 0; i < 10; i++) {
    const wrapped = content.ephemeralMessage?.message || content.viewOnceMessage?.message || content.viewOnceMessageV2?.message
      || content.viewOnceMessageV2Extension?.message || content.documentWithCaptionMessage?.message
      || content.editedMessage?.message || content.protocolMessage?.editedMessage;
    if (!wrapped) break;
    content = wrapped;
  }
  return content;
}

export function messageRecord(record: any) {
  const content = messageContent(record.message);
  const image = content.imageMessage;
  const audio = content.audioMessage;
  const video = content.videoMessage;
  const document = content.documentMessage;
  const sticker = content.stickerMessage;
  const contact = content.contactMessage;
  const contacts = content.contactsArrayMessage?.contacts;
  const location = content.locationMessage || content.liveLocationMessage;
  const poll = content.pollCreationMessage || content.pollCreationMessageV2 || content.pollCreationMessageV3;
  const interactive = content.interactiveMessage;
  const buttons = content.buttonsMessage;
  const list = content.listMessage;
  const reply = content.buttonsResponseMessage || content.templateButtonReplyMessage;
  const template = content.templateMessage?.hydratedTemplate || content.templateMessage?.hydratedFourRowTemplate
    || content.templateMessage?.fourRowTemplate;
  const kind = image ? "image" : audio ? "audio" : video ? "video" : sticker ? "sticker" : document ? "document" : "text";
  let text = content.conversation ?? content.extendedTextMessage?.text ?? image?.caption ?? video?.caption
    ?? document?.caption ?? document?.fileName ?? content.listResponseMessage?.title
    ?? content.listResponseMessage?.singleSelectReply?.selectedRowId ?? reply?.selectedDisplayText ?? reply?.selectedButtonId;
  if (text === undefined && contact) text = `Contato: ${contact.displayName || "Sem nome"}\n${contact.vcard || ""}`;
  if (text === undefined && contacts) text = contacts.map((c: any) => `Contato: ${c.displayName || "Sem nome"}\n${c.vcard || ""}`).join("\n\n");
  if (text === undefined && location) text = [content.liveLocationMessage ? "Localização em tempo real" : "Localização", location.name, location.address,
    typeof location.degreesLatitude === "number" && typeof location.degreesLongitude === "number"
      ? `${location.degreesLatitude}, ${location.degreesLongitude}` : ""].filter(Boolean).join("\n");
  if (text === undefined && poll) text = [poll.name || "Enquete", ...(poll.options || []).map((o: any) => `• ${o.optionName || ""}`)].join("\n");
  if (text === undefined && content.reactionMessage) text = content.reactionMessage.text ? `Reação: ${content.reactionMessage.text}` : "Reação removida";
  if (text === undefined && (interactive || buttons || list || template)) {
    const data = interactive || buttons || list || template;
    text = [data.header?.title || data.title, data.body?.text || data.contentText || data.description || data.hydratedContentText,
      ...(data.buttons || data.hydratedButtons || []).map((b: any) => b.buttonText?.displayText || b.quickReplyButton?.displayText || b.urlButton?.displayText || b.callButton?.displayText),
      ...(data.sections || []).flatMap((s: any) => (s.rows || []).map((r: any) => r.title)), data.footer?.text || data.footerText || data.hydratedFooterText].filter(Boolean).join("\n");
  }
  if (text === undefined && content.interactiveResponseMessage) text = content.interactiveResponseMessage.body?.text || "Resposta interativa";
  if (text === undefined && content.protocolMessage) text = Number(content.protocolMessage.type) === 0 ? "Mensagem apagada no WhatsApp" : "Atualização do WhatsApp";
  if (text === undefined && content.pollUpdateMessage) text = "Voto em enquete";
  if (text === undefined && content.senderKeyDistributionMessage) text = "Atualização de segurança do WhatsApp";
  if (text === undefined && content.call) text = "Chamada do WhatsApp";
  return {
    id: String(record.key?.id || record.id || ""),
    fromMe: record.key?.fromMe === true,
    timestamp: Number(record.messageTimestamp) || 0,
    sender: String(record.pushName || ""),
    kind,
    text: String(text ?? (kind !== "text" ? "" : "O conteúdo desta mensagem não está disponível no histórico do Evolution.")),
    seconds: Number(audio?.seconds || video?.seconds) || 0,
  };
}

export function messageRecords(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages?.records)) return payload.messages.records;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}