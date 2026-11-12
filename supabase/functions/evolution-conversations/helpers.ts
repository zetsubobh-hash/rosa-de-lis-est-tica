export const WALLISTON_ID = "4649913b-f48b-470e-b407-251803756157";

export function canReadConversations(userId: string, roles: string[]) {
  return userId === WALLISTON_ID && roles.includes("admin");
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
    text: String(content.conversation || content.extendedTextMessage?.text || image?.caption || content.videoMessage?.caption || content.documentMessage?.fileName || (audio || image ? "" : "[Mensagem não suportada]")),
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