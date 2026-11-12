import { describe, expect, it } from "vitest";
import { canReadConversations, WALLISTON_ID, messageRecord, messageRecords } from "../../supabase/functions/evolution-conversations/helpers";

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
});