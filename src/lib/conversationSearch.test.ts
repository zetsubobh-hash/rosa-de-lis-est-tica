import { describe, expect, it } from "vitest";
import { foldSearchText, highlightParts } from "./conversationSearch";

describe("Busca por assunto dentro da conversa", () => {
  it("normaliza maiúsculas e acentos do mesmo jeito que o banco", () => {
    expect(foldSearchText("Horário")).toBe("horario");
    expect(foldSearchText("Cepis e Óleo")).toBe("cepis e oleo");
    expect(foldSearchText("Manutenção")).toBe("manutencao");
  });

  it("marca o assunto ignorando maiúsculas e acentos", () => {
    const parts = highlightParts("Podemos remarcar o horário da massagem?", "HORARIO");
    expect(parts.filter(part => part.match).map(part => part.text)).toEqual(["horário"]);
    expect(parts.map(part => part.text).join("")).toBe("Podemos remarcar o horário da massagem?");
  });

  it("marca todas as ocorrências do assunto", () => {
    const parts = highlightParts("pix no pix e no cartão", "pix");
    expect(parts.filter(part => part.match).map(part => part.text)).toEqual(["pix", "pix"]);
  });

  it("não marca nada quando o assunto não aparece ou só tem símbolos de busca", () => {
    expect(highlightParts("Mensagem sobre limpeza", "pix").every(part => !part.match)).toBe(true);
    expect(highlightParts("Mensagem sobre limpeza", "%%%").every(part => !part.match)).toBe(true);
    expect(highlightParts("Mensagem sobre limpeza", "")).toEqual([{ text: "Mensagem sobre limpeza", match: false }]);
  });

  it("preserva o texto inteiro da mensagem", () => {
    const text = "Olá! Confirmação do agendamento de sexta às 14h.";
    expect(highlightParts(text, "agendamento").map(part => part.text).join("")).toBe(text);
  });
});
