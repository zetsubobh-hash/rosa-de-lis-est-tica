import { detectedImageMime, isPublicAddress, publicMediaUrl } from "./storedMedia.ts";

type MediaKind = "image" | "sticker" | "video" | "audio" | "document";
export type DecryptedMedia = { base64: string; mimetype: string; isThumbnail?: boolean };

const APP_INFO: Record<MediaKind, string> = {
  image: "WhatsApp Image Keys",
  sticker: "WhatsApp Image Keys",
  video: "WhatsApp Video Keys",
  audio: "WhatsApp Audio Keys",
  document: "WhatsApp Document Keys",
};

function parseContent(value: unknown): any {
  if (typeof value !== "string") return value && typeof value === "object" ? value : {};
  try { return JSON.parse(value); } catch { return {}; }
}

function unwrapMessage(value: unknown): any {
  let message = parseContent(value);
  for (let i = 0; i < 10; i++) {
    const wrapped = message.ephemeralMessage?.message || message.viewOnceMessage?.message
      || message.viewOnceMessageV2?.message || message.viewOnceMessageV2Extension?.message
      || message.documentWithCaptionMessage?.message || message.editedMessage?.message
      || message.protocolMessage?.editedMessage;
    if (!wrapped) break;
    message = parseContent(wrapped);
  }
  return message;
}

export function toBytes(value: unknown): Uint8Array | null {
  if (!value) return null;
  if (value instanceof Uint8Array) return value.length ? value : null;
  if (typeof value === "string") {
    const clean = value.replace(/^data:[^;]+;base64,/, "").replace(/\s+/g, "");
    if (!clean) return null;
    try {
      const raw = atob(clean);
      const out = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
      return out.length ? out : null;
    } catch { return null; }
  }
  if (Array.isArray(value)) {
    if (!value.length || !value.every(b => typeof b === "number" && Number.isInteger(b) && b >= 0 && b <= 255)) return null;
    return Uint8Array.from(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.type === "Buffer" && Array.isArray(obj.data)) return toBytes(obj.data);
    const keys = Object.keys(obj);
    if (!keys.length || !keys.every(k => /^\d+$/.test(k))) return null;
    const ordered = keys.sort((a, b) => Number(a) - Number(b)).map(k => obj[k]);
    return toBytes(ordered);
  }
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export function whatsappMediaDescriptor(record: any) {
  const message = unwrapMessage(record?.message);
  const entries: [MediaKind, any][] = [
    ["image", message.imageMessage],
    ["sticker", message.stickerMessage],
    ["video", message.videoMessage],
    ["audio", message.audioMessage],
    ["document", message.documentMessage],
  ];
  const found = entries.find(([, node]) => node && typeof node === "object");
  if (!found) return null;
  const [kind, node] = found;
  const urls: string[] = [];
  if (typeof node.url === "string" && node.url.startsWith("https://")) urls.push(node.url);
  if (typeof node.directPath === "string" && node.directPath.startsWith("/")) {
    const directUrl = `https://mmg.whatsapp.net${node.directPath}`;
    if (!urls.includes(directUrl)) urls.push(directUrl);
  }
  return {
    kind,
    urls,
    mediaKey: toBytes(node.mediaKey),
    mimetype: String(node.mimetype || "").split(";")[0].trim().toLowerCase(),
    thumbnail: toBytes(node.jpegThumbnail),
  };
}

export function isWhatsAppMediaUrl(value: string): URL | null {
  const url = publicMediaUrl(value);
  if (!url) return null;
  return /(^|\.)whatsapp\.net$/i.test(url.hostname) ? url : null;
}

export function detectedAudioMime(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  const head4 = new TextDecoder().decode(bytes.subarray(0, 4));
  if (head4 === "OggS") return "audio/ogg";
  if (head4 === "ID3\x03" || head4 === "ID3\x04" || head4.startsWith("ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (bytes.length >= 12 && head4 === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WAVE") return "audio/wav";
  if (bytes.length >= 8 && new TextDecoder().decode(bytes.subarray(4, 8)) === "ftyp") return "audio/mp4";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "audio/webm";
  return null;
}

export async function decryptMediaBytes(encrypted: Uint8Array, mediaKey: Uint8Array, kind: MediaKind): Promise<Uint8Array | null> {
  if (mediaKey.length !== 32 || encrypted.length < 26) return null;
  try {
    const hkdfKey = await crypto.subtle.importKey("raw", new Uint8Array(mediaKey), "HKDF", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode(APP_INFO[kind]),
    }, hkdfKey, 112 * 8);
    const expanded = new Uint8Array(bits);
    const iv = expanded.slice(0, 16);
    const cipherKey = expanded.slice(16, 48);
    const macKey = expanded.slice(48, 80);

    const ciphertext = encrypted.slice(0, encrypted.length - 10);
    const mac = encrypted.subarray(encrypted.length - 10);
    const macInput = new Uint8Array(iv.length + ciphertext.length);
    macInput.set(iv, 0);
    macInput.set(ciphertext, iv.length);
    const hmacKey = await crypto.subtle.importKey("raw", macKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expectedMac = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, macInput)).subarray(0, 10);
    let diff = 0;
    for (let i = 0; i < 10; i++) diff |= expectedMac[i] ^ mac[i];
    if (diff !== 0) return null;

    const aesKey = await crypto.subtle.importKey("raw", cipherKey, { name: "AES-CBC" }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext);
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

export async function downloadAndDecryptWhatsAppMedia(
  record: any,
  resolve: (host: string) => Promise<string[]>,
  fetchFile: typeof fetch = fetch,
  diag?: string[],
): Promise<DecryptedMedia | null> {
  const descriptor = whatsappMediaDescriptor(record);
  if (!descriptor) { diag?.push("no_descriptor"); return null; }
  if (!descriptor.mediaKey || descriptor.mediaKey.length !== 32) { diag?.push(`bad_key:${descriptor.mediaKey?.length || 0}`); return null; }
  if (!descriptor.urls.length) { diag?.push("no_urls"); return null; }
  for (const candidate of descriptor.urls) {
    const url = isWhatsAppMediaUrl(candidate);
    if (!url) { diag?.push("host_rejected"); continue; }
    try {
      const addresses = await resolve(url.hostname);
      if (!addresses.length) { diag?.push("dns_empty"); continue; }
      if (addresses.some(addr => !isPublicAddress(addr))) { diag?.push("dns_private"); continue; }
      const response = await fetchFile(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
      if (!response.ok) { diag?.push(`http_${response.status}`); continue; }
      if (Number(response.headers.get("content-length")) > 20_000_000 || !response.body) { diag?.push("bad_len"); continue; }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      let tooLarge = false;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.length;
        if (length > 20_000_000) { await reader.cancel(); tooLarge = true; break; }
        chunks.push(part.value);
      }
      if (tooLarge || length < 26) { diag?.push("stream_short"); continue; }
      const encrypted = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { encrypted.set(chunk, offset); offset += chunk.length; }
      const plain = await decryptMediaBytes(encrypted, descriptor.mediaKey, descriptor.kind);
      if (!plain || !plain.length) { diag?.push("decrypt_fail"); continue; }
      if (descriptor.kind === "image" || descriptor.kind === "sticker") {
        const detected = detectedImageMime(plain);
        if (!detected) { diag?.push("img_magic_fail"); continue; }
        return { base64: toBase64(plain), mimetype: detected };
      }
      if (descriptor.kind === "audio") {
        const audioMime = detectedAudioMime(plain) || descriptor.mimetype || "audio/ogg";
        return { base64: toBase64(plain), mimetype: audioMime };
      }
      if (!descriptor.mimetype) { diag?.push("no_mime"); continue; }
      return { base64: toBase64(plain), mimetype: descriptor.mimetype };
    } catch {
      diag?.push("fetch_err");
      continue;
    }
  }
  return null;
}

export function extractSavedThumbnail(record: any): DecryptedMedia | null {
  const descriptor = whatsappMediaDescriptor(record);
  if (!descriptor || (descriptor.kind !== "image" && descriptor.kind !== "sticker") || !descriptor.thumbnail) return null;
  const mime = detectedImageMime(descriptor.thumbnail);
  if (!mime) return null;
  return { base64: toBase64(descriptor.thumbnail), mimetype: mime, isThumbnail: true };
}