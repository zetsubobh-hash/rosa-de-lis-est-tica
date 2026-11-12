import { supabase } from "@/integrations/supabase/client";

export type TicketUpdate = {
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  used_appointment_id?: null;
};

export async function saveRouletteTicket(id: string, update: TicketUpdate) {
  const { data, error } = await supabase.from("coupons").update(update).eq("id", id).select("id");
  if (error) throw error;
  if (data?.length !== 1) throw new Error("O ticket não foi atualizado. Confira sua permissão e tente novamente.");
}

export async function deleteRouletteTickets(ids: string[]) {
  if (!ids.length) return;
  const { data, error } = await supabase.from("coupons").delete().in("id", ids).select("id");
  if (error) throw error;
  if (data?.length !== ids.length) throw new Error("Nem todos os tickets foram excluídos. Atualize a lista e tente novamente.");
}