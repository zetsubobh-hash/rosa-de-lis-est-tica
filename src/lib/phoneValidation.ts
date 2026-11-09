export type PhoneProblem = "vazio" | "curto" | "longo" | "ddd" | "celular";

/** Brazilian national digits (DDD + number) without the 55 country code. */
export function nationalDigits(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length >= 11 && d.startsWith("0")) d = d.replace(/^0+/, "");
  return d;
}

/** Returns null when the phone looks like a valid Brazilian number. */
export function phoneFormatProblem(phone: string | null | undefined): PhoneProblem | null {
  const d = nationalDigits(phone);
  if (!d) return "vazio";
  if (d.length < 10) return "curto";
  if (d.length > 11) return "longo";
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99 || d[0] === "0" || d[1] === "0") return "ddd";
  if (d.length === 11 && d[2] !== "9") return "celular";
  return null;
}

export const PHONE_PROBLEM_LABEL: Record<PhoneProblem | "sem_whatsapp", string> = {
  vazio: "Sem telefone",
  curto: "Faltam dígitos",
  longo: "Dígitos demais",
  ddd: "DDD inválido",
  celular: "Celular deve começar com 9",
  sem_whatsapp: "Sem WhatsApp",
};
