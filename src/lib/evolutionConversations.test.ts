import { describe, expect, it, vi } from "vitest";
import { canReadConversations, WALLISTON_ID, messageRecord, messageRecords, mediaRequest, readMedia, EvolutionRequestError } from "../../supabase/functions/evolution-conversations/helpers";

describe("Conversas exclusivas de Walliston", () => {
  it("autoriza somente Walliston com papel admin", () => {
    expect(canReadConversations("4649913b-f48b-470e-b407-251803756157", ["admin"])).toBe(true);
    expect(canReadConversations("outro-admin", ["admin"])).toBe(false);
    expect(canReadConversations(WALLISTON_ID, ["partner"])).toBe(false);
    expect(canReadConversations(WALLISTON_ID, [])).toBe(false);
  });
  it("preserva texto, áudio e imagem sem expor URLs ou chaves de mídia", () => {
    expect(messageRecord({ message: { conversation: "Olá Walliston" } }).text).toBe("Olá Walliston");
    expect(messageRecord({ message: { audioMessage: { seconds: 12, mediaKey: "private" } } })).toMatchObject({ kind: "audio", seconds: 12 });
    const image = messageRecord({ message: { imageMessage: { caption: "Minha foto", url: "private", mediaKey: "private" } } });
    expect(image).toMatchObject({ kind: "image", text: "Minha foto" });
    expect(image).not.toHaveProperty("mediaKey");
    expect(image).not.toHaveProperty("url");
  });
  it("lê resultados paginados do Evolution e mensagens encapsuladas", () => {
    expect(messageRecords({ messages: { records: [{ id: "a" }], pages: 2 } })).toEqual([{ id: "a" }]);
    expect(messageRecord({ message: { ephemeralMessage: { message: { extendedTextMessage: { text: "Olá" } } } } }).text).toBe("Olá");
  });
  it("converte bytes salvos em base64 sem enviar campos do banco ao decodificador", () => {
    const request = mediaRequest({ id: "database-id", instanceId: "private", key: { id: "whatsapp-id" }, message: { imageMessage: {
      mediaKey: { type: "Buffer", data: [0, 127, 255] }, fileSha256: { "1": 255, "0": 0 }, jpegThumbnail: [1, 2, 3],
    } } });
    expect(request).toEqual({ message: { key: { id: "whatsapp-id" }, message: { imageMessage: {
      mediaKey: "AH//", fileSha256: "AP8=", jpegThumbnail: "AQID",
    } } }, convertToMp4: false });
  });
  it("repete um erro 400 usando a chave da mensagem para hidratação no Evolution", async () => {
    const record = { key: { id: "whatsapp-id", remoteJid: "123@s.whatsapp.net" }, message: { audioMessage: {} } };
    const call = vi.fn().mockRejectedValueOnce(new EvolutionRequestError(400)).mockResolvedValueOnce({ base64: "AQID" });
    expect(await readMedia(record, call)).toEqual({ base64: "AQID" });
    expect(call).toHaveBeenNthCalledWith(2, { message: { key: record.key }, convertToMp4: false });
  });
  it("trata mídia indisponível como resultado recuperável e não oculta falhas de autorização", async () => {
    const record = { key: { id: "id" }, message: { imageMessage: {} } };
    const expired = vi.fn().mockRejectedValue(new EvolutionRequestError(400));
    expect(await readMedia(record, expired)).toBeNull();
    expect(expired).toHaveBeenCalledTimes(2);
    const denied = vi.fn().mockRejectedValue(new EvolutionRequestError(401));
    await expect(readMedia(record, denied)).rejects.toMatchObject({ status: 401 });
    expect(denied).toHaveBeenCalledTimes(1);
  });
});