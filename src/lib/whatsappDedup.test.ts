import { describe, expect, it } from "vitest";
import {
  buildBirthdayDedupKey,
  buildBotMsgDedupKey,
  buildErrorMonitorDedupKey,
  buildNotifyDedupKey,
  buildPromoDedupKey,
  buildReminderDedupKey,
  buildResetOtpDedupKey,
  claimWhatsappSend,
  normalizeBrPhone,
  uniqueBrPhones,
} from "../../supabase/functions/_shared/whatsappDedup";

describe("whatsappDedup", () => {
  it("normalizes and deduplicates Brazilian phone numbers regardless of formatting", () => {
    expect(normalizeBrPhone("(31) 99588-2521")).toBe("5531995882521");
    expect(normalizeBrPhone("5531995882521")).toBe("5531995882521");
    expect(normalizeBrPhone("123")).toBeNull();
    expect(
      uniqueBrPhones(["(31) 99588-2521", "5531995882521", "31 995882521", null, "(31) 97352-1501"]),
    ).toEqual(["5531995882521", "5531973521501"]);
  });

  it("produces stable keys for new vs reschedule notifications so rescheduling to a new slot still sends", () => {
    const newKey = buildNotifyDedupKey("new", "apt-1", "2026-11-25", "14:00", "client", "5531999990000");
    const newKeySame = buildNotifyDedupKey("new", "apt-1", "2026-11-25", "14:00", "client", "5531999990000");
    expect(newKey).toBe(newKeySame);

    const res1 = buildNotifyDedupKey("reschedule", "apt-1", "2026-11-25", "15:00", "client", "5531999990000");
    const res2 = buildNotifyDedupKey("reschedule", "apt-1", "2026-11-26", "16:00", "client", "5531999990000");
    expect(res1).not.toBe(res2);
  });

  it("produces deterministic keys for reminders, birthdays, bot webhooks, promos, error monitor and reset OTP", () => {
    expect(buildReminderDedupKey("apt-1", "2026-11-25", "14:00", "5531999990000"))
      .toBe("reminder:apt-1:2026-11-25:14:00:5531999990000");
    expect(buildBirthdayDedupKey(2026, "u-1", "client", "5531999990000"))
      .toBe("birthday:2026:u-1:client:5531999990000");
    expect(buildBotMsgDedupKey(" 3EB0ABC ")).toBe("bot:msg:3EB0ABC");
    expect(buildPromoDedupKey("camp-1", "5531999990000")).toBe("promo:camp-1:5531999990000");

    const t0 = 1_700_000_000_000;
    expect(buildErrorMonitorDedupKey("TypeError: x", t0, 900_000))
      .toBe(buildErrorMonitorDedupKey("TypeError: x", t0 + 10_000, 900_000));
    expect(buildErrorMonitorDedupKey("TypeError: x", t0, 900_000))
      .not.toBe(buildErrorMonitorDedupKey("TypeError: x", t0 + 900_000, 900_000));

    expect(buildResetOtpDedupKey("u-1", t0, 60_000))
      .toBe(buildResetOtpDedupKey("u-1", t0 + 5_000, 60_000));
  });

  it("claims a key once and blocks duplicate or failed RPC calls", async () => {
    const seen = new Set<string>();
    const fakeDb = {
      rpc: async (_fn: string, params: Record<string, unknown>) => {
        const k = String(params.p_key);
        if (seen.has(k)) return { data: false, error: null };
        seen.add(k);
        return { data: true, error: null };
      },
    };

    expect(await claimWhatsappSend(fakeDb, "reminder:1", "appointment-reminder")).toBe(true);
    expect(await claimWhatsappSend(fakeDb, "reminder:1", "appointment-reminder")).toBe(false);

    const failingDb = { rpc: async () => ({ data: null, error: { message: "db error" } }) };
    expect(await claimWhatsappSend(failingDb, "reminder:2", "appointment-reminder")).toBe(false);
  });
});