export const PETALS_PER_REWARD = 10;

export function petalProgress(completed: number) {
  const safe = Math.max(0, Math.floor(completed || 0));
  return { filled: safe % PETALS_PER_REWARD, rewardsEarned: Math.floor(safe / PETALS_PER_REWARD) };
}

const GUIDES: { keys: string[]; tips: string[] }[] = [
  { keys: ["limpeza", "pele", "facial", "peeling"], tips: ["Evite maquiagem pelas próximas 12 horas.", "Use protetor solar e evite sol direto por 48 horas.", "Hidrate bem a pele e não esfolie por 5 dias."] },
  { keys: ["drenagem", "linfatica"], tips: ["Beba bastante água ao longo do dia.", "Evite alimentos muito salgados nas próximas 24 horas.", "Faça caminhadas leves para potencializar o resultado."] },
  { keys: ["massagem", "redutora", "modeladora", "lipo", "criolipolise", "gordura"], tips: ["Beba no mínimo 2 litros de água hoje.", "Prefira alimentação leve, com menos açúcar e sal.", "Pratique atividade física leve para manter o resultado."] },
  { keys: ["depila", "laser"], tips: ["Evite sol e piscina por 48 horas.", "Não use cremes com ácidos ou perfume na região por 2 dias.", "Use roupas leves e hidrate a pele."] },
  { keys: ["sobrancelha", "cilios", "lash", "micro"], tips: ["Não molhe a região por 24 horas.", "Evite maquiagem e produtos oleosos na área.", "Não coce nem esfregue a região."] },
];
const DEFAULT_TIPS = ["Beba bastante água e descanse bem.", "Evite exposição solar intensa nas próximas 24 horas.", "Em caso de qualquer desconforto, fale conosco pelo WhatsApp."];

export function careTipsFor(slugOrTitle: string): string[] {
  const s = (slugOrTitle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return GUIDES.find((g) => g.keys.some((k) => s.includes(k)))?.tips ?? DEFAULT_TIPS;
}

export type ClientCareFilter = "all" | "scheduled" | "finished";

/** Classifica clientes por situação na agenda: agendados (pendente/confirmado hoje ou no futuro) e finalizados. */
export function classifyClientAppointments(
  userIds: string[],
  appointments: { user_id: string; status: string; appointment_date: string }[],
  today: string,
) {
  const scheduled = new Set<string>();
  const finished = new Set<string>();
  for (const a of appointments) {
    if (a.status === "completed") finished.add(a.user_id);
    else if ((a.status === "pending" || a.status === "confirmed") && a.appointment_date >= today) scheduled.add(a.user_id);
  }
  const filterIds = (f: ClientCareFilter) =>
    userIds.filter((id) => (f === "scheduled" ? scheduled.has(id) : f === "finished" ? finished.has(id) : true));
  return {
    counts: { all: userIds.length, scheduled: scheduled.size, finished: finished.size },
    filterIds,
  };
}

export function calendarUrl(title: string, date: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const start = `${date.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m || 0).padStart(2, "0")}00`;
  const endH = h + 1;
  const end = `${date.replace(/-/g, "")}T${String(endH).padStart(2, "0")}${String(m || 0).padStart(2, "0")}00`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: `${title} - Rosa de Lis Estética`, dates: `${start}/${end}`, ctz: "America/Sao_Paulo" });
  return `https://calendar.google.com/calendar/render?${p}`;
}
