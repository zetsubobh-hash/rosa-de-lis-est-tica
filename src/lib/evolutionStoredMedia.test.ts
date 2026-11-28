import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvolutionRequestError, readMedia } from "../../supabase/functions/evolution-conversations/helpers";
import { readStoredMedia, downloadStoredMedia, publicMediaUrl, isPublicAddress, storedMediaMetadata } from "../../supabase/functions/evolution-conversations/storedMedia";
import { decryptMediaBytes, downloadAndDecryptWhatsAppMedia, extractSavedThumbnail, isWhatsAppMediaUrl } from "../../supabase/functions/evolution-conversations/whatsappMedia";

const record = { id: "db-message-123", key: { id: "wa-photo-123", remoteJid: "5511999999999@s.whatsapp.net" },
  message: { imageMessage: { mimetype: "image/png", url: "https://mmg.whatsapp.net/expired.enc" }, mediaUrl: "https://files.example.com/photo.png" } };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=";

// jsdom's AbortSignal lacks timeout; the production Deno runtime supports it.
beforeEach(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterEach(() => vi.unstubAllGlobals());

describe("Imagens salvas no Evolution", () => {
  it("recupera a cópia salva mesmo quando o download do WhatsApp falha nas três tentativas", async () => {
    const decoder = vi.fn().mockRejectedValue(new EvolutionRequestError(400));
    expect(await readMedia(record, decoder)).toBeNull();
    const call = vi.fn();
    const download = vi.fn().mockResolvedValue({ base64: png, mimetype: "image/png" });
    expect(await readStoredMedia(record, call, download)).toEqual({ base64: png, mimetype: "image/png" });
    expect(download).toHaveBeenCalledWith("https://files.example.com/photo.png", "image/png");
    expect(call).not.toHaveBeenCalled();
  });

  it("renova o link S3 expirado usando a mensagem verificada, não um identificador enviado pelo navegador", async () => {
    const row = { id: "media-456", messageId: record.id, mimetype: "image/png", Message: record };
    const call = vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce({ ...row, mediaUrl: "https://files.example.com/fresh.png" });
    const download = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ base64: png, mimetype: "image/png" });
    expect(await readStoredMedia(record, call, download)).toMatchObject({ base64: png });
    expect(call).toHaveBeenNthCalledWith(1, "s3/getMedia", { Message: { id: "db-message-123" } });
    expect(call).toHaveBeenNthCalledWith(2, "s3/getMediaUrl", { id: "media-456", expiry: "900" });
    expect(download).toHaveBeenLastCalledWith("https://files.example.com/fresh.png", "image/png");
  });

  it("não baixa nem renova arquivos associados a outra mensagem ou conversa", async () => {
    const call = vi.fn().mockResolvedValue([{ id: "other-media", messageId: "other-message" },
      { id: "wrong-chat", messageId: record.id, Message: { ...record, key: { ...record.key, remoteJid: "other@lid" } } }]);
    const download = vi.fn().mockResolvedValue(null);
    expect(await readStoredMedia(record, call, download)).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("mantém a leitura WhatsApp nas instalações sem S3 e preserva erros de autorização", async () => {
    const download = vi.fn().mockResolvedValue(null);
    expect(await readStoredMedia(record, vi.fn().mockRejectedValue(new EvolutionRequestError(404)), download)).toBeNull();
    await expect(readStoredMedia(record, vi.fn().mockRejectedValue(new EvolutionRequestError(401)), download)).rejects.toMatchObject({ status: 401 });
  });

  it("lê mídia serializada e encapsulada sem confundir miniatura com imagem completa", () => {
    expect(storedMediaMetadata({ message: JSON.stringify({ mediaUrl: "https://files.example.com/full.png", viewOnceMessageV2: {
      message: { imageMessage: { mimetype: "image/png", jpegThumbnail: png } } } }) })).toEqual({ url: "https://files.example.com/full.png", mime: "image/png", base64: "" });
  });

  it("baixa os bytes completos, detecta PNG e nunca encaminha a chave do Evolution", async () => {
    const fetchFile = vi.fn().mockResolvedValue(new Response(Uint8Array.from(atob(png), c => c.charCodeAt(0)), { headers: { "content-type": "application/octet-stream" } }));
    expect(await downloadStoredMedia("https://files.example.com/photo.png", "", async () => ["93.184.216.34"], fetchFile)).toEqual({ base64: png, mimetype: "image/png" });
    expect(fetchFile).toHaveBeenCalledWith(new URL("https://files.example.com/photo.png"), expect.objectContaining({ redirect: "error" }));
    expect(fetchFile.mock.calls[0][1]).not.toHaveProperty("headers");
  });

  it("bloqueia endereços internos e URLs com credenciais antes de qualquer download", async () => {
    for (const url of ["http://files.example.com/a", "https://127.0.0.1/a", "https://localhost/a", "https://user:secret@files.example.com/a", "https://files.example.com:8080/a"]) {
      expect(publicMediaUrl(url)).toBeNull();
    }
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "192.168.0.1", "100.64.0.1", "::1", "::ffff:127.0.0.1", "fc00::1"]) expect(isPublicAddress(ip)).toBe(false);
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    const fetchFile = vi.fn();
    expect(await downloadStoredMedia("https://files.example.com/a", "image/png", async () => ["127.0.0.1"], fetchFile)).toBeNull();
    expect(fetchFile).not.toHaveBeenCalled();
  });

  it("não trata resposta HTML, bytes vazios, arquivo muito grande ou falsa imagem como foto", async () => {
    for (const response of [new Response("<html>erro</html>", { headers: { "content-type": "text/html" } }),
      new Response(""), new Response("error", { headers: { "content-type": "image/jpeg" } }),
      new Response("x", { headers: { "content-length": "20000001" } })]) {
      expect(await downloadStoredMedia("https://files.example.com/a", "image/png", async () => ["93.184.216.34"], vi.fn().mockResolvedValue(response))).toBeNull();
    }
  });

  it("baixa e decifra imagem diretamente do CDN do WhatsApp com mediaKey (HKDF + AES-256-CBC)", async () => {
    const plainBytes = Uint8Array.from(atob(png), c => c.charCodeAt(0));
    const mediaKey = new Uint8Array(32).map((_, i) => (i * 7 + 3) & 255);
    const hkdf = await crypto.subtle.importKey("raw", mediaKey, "HKDF", false, ["deriveBits"]);
    const expanded = new Uint8Array(await crypto.subtle.deriveBits({
      name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: new TextEncoder().encode("WhatsApp Image Keys"),
    }, hkdf, 112 * 8));
    const iv = expanded.subarray(0, 16);
    const aesKey = await crypto.subtle.importKey("raw", expanded.subarray(16, 48), { name: "AES-CBC" }, false, ["encrypt"]);
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesKey, plainBytes));
    const macInput = new Uint8Array(iv.length + cipher.length);
    macInput.set(iv, 0); macInput.set(cipher, iv.length);
    const hmacKey = await crypto.subtle.importKey("raw", expanded.subarray(48, 80), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, macInput)).subarray(0, 10);
    const encrypted = new Uint8Array(cipher.length + 10);
    encrypted.set(cipher, 0); encrypted.set(mac, cipher.length);

    const msgRecord = {
      message: {
        imageMessage: {
          mimetype: "image/png",
          directPath: "/v/t62.7118-24/sample.enc",
          mediaKey: Object.fromEntries(Array.from(mediaKey).map((b, i) => [String(i), b])),
        },
      },
    };
    const fetchFile = vi.fn().mockResolvedValue(new Response(encrypted));
    const result = await downloadAndDecryptWhatsAppMedia(msgRecord, async () => ["157.240.1.54"], fetchFile);
    expect(result).toEqual({ base64: png, mimetype: "image/png" });
    expect(fetchFile).toHaveBeenCalledWith(new URL("https://mmg.whatsapp.net/v/t62.7118-24/sample.enc"), expect.objectContaining({ redirect: "error" }));

    const tampered = encrypted.slice();
    tampered[0] ^= 0xff;
    expect(await decryptMediaBytes(tampered, mediaKey, "image")).toBeNull();
  });

  it("aceita apenas domínios whatsapp.net na decifragem direta", () => {
    expect(isWhatsAppMediaUrl("https://mmg.whatsapp.net/v/t62.7118-24/a.enc")).not.toBeNull();
    expect(isWhatsAppMediaUrl("https://media-gru2-2.cdn.whatsapp.net/v/a.enc")).not.toBeNull();
    expect(isWhatsAppMediaUrl("https://evil.example.com/a.enc")).toBeNull();
  });

  it("recupera a prévia jpegThumbnail salva no registro do Evolution como último recurso", () => {
    const pngBytes = Array.from(Uint8Array.from(atob(png), c => c.charCodeAt(0)));
    const numericMap = Object.fromEntries(pngBytes.map((b, i) => [String(i), b]));
    expect(extractSavedThumbnail({ message: { imageMessage: { jpegThumbnail: numericMap } } }))
      .toEqual({ base64: png, mimetype: "image/png", isThumbnail: true });
    expect(extractSavedThumbnail({ message: { imageMessage: { jpegThumbnail: png } } }))
      .toEqual({ base64: png, mimetype: "image/png", isThumbnail: true });
    expect(extractSavedThumbnail({ message: { videoMessage: { jpegThumbnail: png } } })).toBeNull();
  });
});