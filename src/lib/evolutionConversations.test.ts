import { describe, expect, it, vi } from "vitest";
import { canReadConversations, WALLISTON_ID, messageRecord, messageRecords, mediaRequest, readMedia, EvolutionRequestError, phoneFromRecord, conversationRecord, mergeConversation, hasNextMessagePage } from "../../supabase/functions/evolution-conversations/helpers";

describe("Conversas exclusivas de Walliston", () => {
  it("identifica celulares sem confundir identificadores LID ou grupos com telefone", () => {
    expect(phoneFromRecord({ remoteJid: "5511999999999@s.whatsapp.net" })).toBe("5511999999999");
    expect(phoneFromRecord({ remoteJid: "123456789012345@lid" })).toBeNull();
    expect(phoneFromRecord({ remoteJid: "123456789012345@g.us" })).toBeNull();
    expect(phoneFromRecord({ key: { remoteJid: "123456789012345@lid", remoteJidAlt: "5511988888888@s.whatsapp.net" } })).toBe("5511988888888");
  });
  it("descobre conversas pelo histórico mesmo quando ausentes em findChats", () => {
    expect(conversationRecord({ key: { id: "msg1", remoteJid: "5511999999999@s.whatsapp.net" }, pushName: "Ana", messageTimestamp: 100, message: { conversation: "Olá" } }, true))
      .toMatchObject({ jid: "5511999999999@s.whatsapp.net", phone: "5511999999999", name: "Ana", last_timestamp: 100 });
  });
  it("preserva celular, nome e última mensagem ao importar páginas antigas", () => {
    const previous = { name: "Ana", phone: "5511999999999", last_timestamp: 100, last_message: { text: "Nova" } };
    const incoming = conversationRecord({ remoteJid: "123456789012345@lid", lastMessage: { messageTimestamp: 50, message: { conversation: "Antiga" } } });
    if (!incoming) throw new Error("Conversa inválida");
    expect(mergeConversation(incoming, previous)).toMatchObject(previous);
  });
  it("continua após mil mensagens até a última página informada pelo Evolution", () => {
    expect(hasNextMessagePage({ messages: { records: [], pages: 12 } }, 6, 200)).toBe(true);
    expect(hasNextMessagePage({ messages: { records: [], pages: 12 } }, 12, 200)).toBe(false);
    expect(hasNextMessagePage({ records: Array.from({ length: 200 }, (_, id) => ({ id })) }, 30, 200)).toBe(true);
    expect(hasNextMessagePage({ records: [] }, 31, 200)).toBe(false);
  });
  it("recupera texto serializado, editado e envelopes adicionais sem expor contexto privado", () => {
    expect(messageRecord({ message: JSON.stringify({ conversation: "Texto salvo" }) }).text).toBe("Texto salvo");
    expect(messageRecord({ message: { protocolMessage: { editedMessage: { conversation: "Texto corrigido" } } } }).text).toBe("Texto corrigido");
    expect(messageRecord({ message: { viewOnceMessageV2Extension: { message: { extendedTextMessage: { text: "Texto encapsulado", contextInfo: { secret: "private" } } } } } })).toMatchObject({ kind: "text", text: "Texto encapsulado" });
    expect(messageRecord({ message: { extendedTextMessage: { text: "Seguro", contextInfo: { secret: "private" } } } })).not.toHaveProperty("contextInfo");
  });
  it("distingue figurinha, vídeo e documento para abrir o tipo correto de arquivo", () => {
    expect(messageRecord({ message: { stickerMessage: { mediaKey: "private" } } })).toMatchObject({ kind: "sticker", text: "" });
    expect(messageRecord({ message: { videoMessage: { caption: "Resultado", seconds: 9 } } })).toMatchObject({ kind: "video", text: "Resultado", seconds: 9 });
    expect(messageRecord({ message: { documentWithCaptionMessage: { message: { documentMessage: { fileName: "ficha.pdf" } } } } })).toMatchObject({ kind: "document", text: "ficha.pdf" });
  });
  it("recupera dados de contatos, localização, reações, enquetes e botões", () => {
    expect(messageRecord({ message: { contactMessage: { displayName: "Ana", vcard: "TEL:5511999999999" } } }).text).toContain("5511999999999");
    expect(messageRecord({ message: { locationMessage: { degreesLatitude: -23.5, degreesLongitude: -46.6 } } }).text).toContain("-23.5, -46.6");
    expect(messageRecord({ message: { reactionMessage: { text: "❤️" } } }).text).toContain("❤️");
    expect(messageRecord({ message: { pollCreationMessageV3: { name: "Horário?", options: [{ optionName: "Manhã" }] } } }).text).toContain("Manhã");
    expect(messageRecord({ message: { buttonsResponseMessage: { selectedDisplayText: "Confirmar" } } }).text).toBe("Confirmar");
    expect(messageRecord({ message: { buttonsMessage: { contentText: "Escolha", buttons: [{ buttonText: { displayText: "Agendar" } }] } } }).text).toContain("Agendar");
  });
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
    expect(call).toHaveBeenNthCalledWith(2, { message: { key: record.key }, convertToMp4: true });
  });
  it("trata mídia indisponível como resultado recuperável e não oculta falhas de autorização", async () => {
    const record = { key: { id: "id" }, message: { imageMessage: {} } };
    const expired = vi.fn().mockRejectedValue(new EvolutionRequestError(400));
    expect(await readMedia(record, expired)).toBeNull();
    expect(expired).toHaveBeenCalledTimes(3);
    const denied = vi.fn().mockRejectedValue(new EvolutionRequestError(401));
    await expect(readMedia(record, denied)).rejects.toMatchObject({ status: 401 });
    expect(denied).toHaveBeenCalledTimes(1);
  });
  it("desencapsula áudio serializado para o download e pede formato reproduzível", () => {
    const result = mediaRequest({ key: { id: "a" }, message: JSON.stringify({ ephemeralMessage: { message: { audioMessage: { mediaKey: [1, 2, 3] } } } }) });
    expect(result).toMatchObject({ convertToMp4: true, message: { message: { audioMessage: { mediaKey: "AQID" } } } });
    expect(result.message.message).not.toHaveProperty("ephemeralMessage");
  });
  it("tenta bytes nativos quando o Evolution rejeita base64 e hidratação", async () => {
    const record = { key: { id: "photo", remoteJid: "5511999999999@s.whatsapp.net" }, message: { imageMessage: { mediaKey: { 0: 1, 1: 2 } } } };
    const call = vi.fn().mockRejectedValueOnce(new EvolutionRequestError(400)).mockRejectedValueOnce(new EvolutionRequestError(400)).mockResolvedValueOnce({ data: { base64: "AQID", mimetype: "image/jpeg" } });
    expect(await readMedia(record, call)).toMatchObject({ base64: "AQID", mimetype: "image/jpeg" });
    expect(call).toHaveBeenNthCalledWith(3, expect.objectContaining({ message: expect.objectContaining({ key: record.key, message: record.message }) }));
  });
  it("não considera resposta vazia ou nula como mídia carregada", async () => {
    const call = vi.fn().mockResolvedValue(null);
    expect(await readMedia({ key: { id: "a" }, message: { imageMessage: {} } }, call)).toBeNull();
    expect(call).toHaveBeenCalledTimes(3);
  });
});