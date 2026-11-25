export function normalizeBrPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

export function uniqueBrPhones(phones: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phones) {
    const normalized = normalizeBrPhone(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

export function buildNotifyDedupKey(
  type: "new" | "reschedule",
  appointmentId: string,
  date: string,
  time: string,
  role: string,
  phone: string,
): string {
  return type === "reschedule"
    ? `notify:reschedule:${appointmentId}:${date}:${time}:${role}:${phone}`
    : `notify:new:${appointmentId}:${role}:${phone}`;
}

export function buildReminderDedupKey(
  appointmentId: string,
  date: string,
  time: string,
  phone: string,
): string {
  return `reminder:${appointmentId}:${date}:${time}:${phone}`;
}

export function buildBirthdayDedupKey(
  year: number,
  userId: string,
  kind: string,
  phone: string,
): string {
  return `birthday:${year}:${userId}:${kind}:${phone}`;
}

export function buildBotMsgDedupKey(messageId: string): string {
  return `bot:msg:${messageId.trim()}`;
}

export function buildErrorMonitorDedupKey(
  signature: string,
  nowMs = Date.now(),
  windowMs = 15 * 60_000,
): string {
  const bucket = Math.floor(nowMs / windowMs);
  const cleanSig = signature.replace(/\s+/g, " ").trim().slice(0, 140);
  return `err:${bucket}:${cleanSig}`;
}

export function buildPromoDedupKey(campaignId: string, phone: string): string {
  return `promo:${campaignId}:${phone}`;
}

export function buildResetOtpDedupKey(
  userId: string,
  nowMs = Date.now(),
  windowMs = 60_000,
): string {
  const bucket = Math.floor(nowMs / windowMs);
  return `reset-otp:${userId}:${bucket}`;
}

export async function claimWhatsappSend(
  supabase: { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  key: string,
  source: string,
): Promise<boolean> {
  if (!key.trim()) return false;
  const { data, error } = await supabase.rpc("claim_whatsapp_send", {
    p_key: key,
    p_source: source,
  });
  if (error) {
    console.error(`[whatsappDedup] claim failed (${source}):`, error);
    return false;
  }
  return data === true;
}