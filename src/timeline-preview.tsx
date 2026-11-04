import { createRoot } from "react-dom/client";
import DayTimelineView from "@/components/admin/DayTimelineView";
import "./index.css";

const mk = (
  id: string,
  name: string,
  time: string,
  slug: string,
  title: string,
  status = "confirmed",
  phone = "5511999990000"
) => ({
  id,
  service_title: title,
  service_slug: slug,
  appointment_time: time,
  status,
  user_id: id,
  session_number: 1,
  plan_id: null,
  total_sessions: 5,
  completed_sessions: 2,
  planSessions: [],
  profiles: { full_name: name, phone, email: null, avatar_url: null },
});

const appointments = [
  mk("a1", "Alisson Luiz", "08:00", "massagem-redutora", "Massagem Redutora"),
  mk("a2", "Mariana Souza", "09:30", "limpeza-pele", "Limpeza de Pele", "pending"),
  mk("a3", "Fabrício Almeida", "11:00", "micropigmentacao", "Micropigmentação Sobrancelhas"),
  mk("a4", "Kevin Costa", "11:00", "drenagem-linfatica", "Drenagem Linfática"),
  mk("a5", "Juliana Prado", "13:30", "peeling-quimico", "Peeling Químico", "completed"),
  mk("a6", "Beatriz Nunes", "15:00", "botox", "Aplicação de Botox"),
  mk("a7", "Carla Mendes", "17:30", "massagem-redutora", "Massagem Redutora", "pending"),
];

createRoot(document.getElementById("root")!).render(
  <div className="p-6 bg-background min-h-screen">
    <h1 className="font-heading text-lg font-bold mb-3">Agenda — prévia da linha do tempo</h1>
    <DayTimelineView
      appointments={appointments as any}
      clientPlans={[]}
      partnerOptions={[]}
      allPrices={[]}
      timelineDate="2026-11-04"
      onSlotClick={() => {}}
      onDragReschedule={() => {}}
      onComplete={() => {}}
      onMarkNoShow={() => {}}
      onConfirmPayment={() => {}}
      onReschedule={() => {}}
      onCancel={() => {}}
      onPartnerAssign={() => {}}
      isOverdue={(a: any) => a.id === "a2"}
    />
  </div>
);
