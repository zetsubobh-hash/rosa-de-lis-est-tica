export const normalizeWhatsAppPhone = (value?: string | null) => {
  if (!value) return "";

  let digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");

  if (digits.startsWith("55")) return digits;

  return `55${digits.slice(0, 11)}`;
};

export const buildWhatsAppLink = (phone?: string | null, message?: string) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const params = message ? `?text=${encodeURIComponent(message)}` : "";

  return normalizedPhone ? `https://wa.me/${normalizedPhone}${params}` : "https://wa.me/";
};