import { EvolutionRequestError } from "./helpers.ts";

type Media = { base64: string; mimetype: string };
type ProviderCall = (path: string, body: object) => Promise<any>;
type Download = (url: string, mime: string) => Promise<Media | null>;

function content(value: any): any {
  if (typeof value !== "string") return value || {};
  try { return JSON.parse(value); } catch { return {}; }
}

export function storedMediaMetadata(record: any) {
  let message = content(record.message);
  const root = message;
  for (let i = 0; i < 10; i++) {
    const wrapped = message.ephemeralMessage?.message || message.viewOnceMessage?.message
      || message.viewOnceMessageV2?.message || message.viewOnceMessageV2Extension?.message
      || message.documentWithCaptionMessage?.message;
    if (!wrapped) break;
    message = content(wrapped);
  }
  const media = message.imageMessage || message.stickerMessage || message.videoMessage
    || message.audioMessage || message.documentMessage || {};
  return {
    url: root.mediaUrl || message.mediaUrl || record.mediaUrl || "",
    mime: String(media.mimetype || record.mimetype || "").split(";")[0].trim().toLowerCase(),
    base64: root.base64 || record.base64 || "",
  };
}

function belongsToMessage(media: any, record: any) {
  const linked = media?.Message || media?.message;
  return Boolean(record.id && (media?.messageId === record.id || linked?.id === record.id)
    && (!linked?.key || (linked.key.id === record.key?.id && linked.key.remoteJid === record.key?.remoteJid)));
}

export async function readStoredMedia(record: any, call: ProviderCall, download: Download): Promise<Media | null> {
  const metadata = storedMediaMetadata(record);
  if (typeof metadata.base64 === "string" && metadata.base64 && metadata.mime) {
    return { base64: metadata.base64, mimetype: metadata.mime };
  }
  if (typeof metadata.url === "string" && metadata.url) {
    const saved = await download(metadata.url, metadata.mime);
    if (saved) return saved;
  }
  if (!record.id) return null;
  try {
    // Evolution 2.3.x validates messageId as an integer even though its database
    // IDs are strings. The relation filter is scoped to the verified Message ID.
    const result = await call("s3/getMedia", { Message: { id: record.id } });
    const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    for (const row of rows) {
      if (!row?.id || !belongsToMessage(row, record)) continue;
      const renewed = await call("s3/getMediaUrl", { id: String(row.id), expiry: "900" });
      const value = renewed?.data || renewed;
      if (!value?.mediaUrl || (value.Message && !belongsToMessage(value, record))) continue;
      const saved = await download(value.mediaUrl, String(value.mimetype || row.mimetype || metadata.mime));
      if (saved) return saved;
    }
  } catch (error) {
    // Installations without S3 still use the WhatsApp decoder; authorization and
    // server errors must never be disguised as an expired file.
    if (!(error instanceof EvolutionRequestError) || ![400, 404, 410].includes(error.status)) throw error;
  }
  return null;
}

export function publicMediaUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")
      || !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":")
      || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)
      || host === "metadata.google.internal") return null;
    return url;
  } catch { return null; }
}

export function isPublicAddress(address: string): boolean {
  if (address.includes(":")) {
    // Conservatively accept only globally routable unicast IPv6, excluding
    // documentation and embedded IPv4 ranges.
    return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0|2|10|20):/i.test(address);
  }
  const bytes = address.split(".").map(Number);
  if (bytes.length !== 4 || bytes.some(b => !Number.isInteger(b) || b < 0 || b > 255)) return false;
  const [a, b] = bytes;
  return a > 0 && a < 224 && a !== 10 && a !== 127
    && !(a === 100 && b >= 64 && b <= 127) && !(a === 169 && b === 254)
    && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && [0, 168].includes(b))
    && !(a === 198 && [18, 19, 51].includes(b)) && !(a === 203 && b === 0);
}

export function detectedImageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) return "image/png";
  const prefix = new TextDecoder().decode(bytes.slice(0, 12));
  if (prefix.startsWith("GIF87a") || prefix.startsWith("GIF89a")) return "image/gif";
  if (prefix.startsWith("RIFF") && prefix.slice(8) === "WEBP") return "image/webp";
  return null;
}

export async function downloadStoredMedia(
  value: string, fallbackMime: string, resolve: (host: string) => Promise<string[]>,
  fetchFile: typeof fetch = fetch,
): Promise<Media | null> {
  const url = publicMediaUrl(value);
  if (!url) return null;
  try {
    const addresses = await resolve(url.hostname);
    if (!addresses.length || addresses.some(address => !isPublicAddress(address))) return null;
    // Never forward the Evolution API key or follow a redirect to another host.
    const response = await fetchFile(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok || Number(response.headers.get("content-length")) > 20_000_000 || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 20_000_000) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    if (!length) return null;
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const headerMime = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (["text/html", "application/json", "application/xml", "text/xml"].includes(headerMime)) return null;
    const mimetype = detectedImageMime(bytes) || (headerMime === "application/octet-stream" || !headerMime ? fallbackMime : headerMime);
    if (mimetype.startsWith("image/") && !detectedImageMime(bytes)) return null;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { base64: btoa(binary), mimetype };
  } catch {
    // A stale signed URL, missing object or inaccessible host permits renewal.
    return null;
  }
}