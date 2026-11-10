import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/agendaClients";

export const loadSharedPartnerAgenda = () => fetchAllPages((from, to) =>
  supabase.from("appointments")
    .select("id, service_title, service_slug, appointment_date, appointment_time, status, user_id, plan_id, session_number, notes, partner_id, room_number")
    .in("status", ["confirmed", "pending"])
    .order("appointment_date").order("appointment_time").order("id")
    .range(from, to),
);

export async function loadAgendaLabels(userIds: string[]) {
  const data: { user_id: string; full_name: string; avatar_url: string | null }[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const result = await supabase.rpc("get_agenda_client_labels", { _user_ids: userIds.slice(i, i + 200) });
    if (result.error) return { data: null, error: result.error };
    data.push(...(result.data || []));
  }
  return { data, error: null };
}