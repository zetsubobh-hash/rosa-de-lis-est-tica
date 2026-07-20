import { useSiteSettings } from "@/hooks/useSiteSettings";
import { buildWhatsAppLink, normalizeWhatsAppPhone } from "@/lib/whatsapp";

export const useOnlineBooking = () => {
  const { settings, loading } = useSiteSettings();

  const isEnabled = (settings.online_booking_enabled ?? "true") === "true";
  const whatsappNumber = normalizeWhatsAppPhone(settings.whatsapp_number || "");

  const getWhatsAppUrl = (serviceTitle?: string) => {
    const msg = serviceTitle
      ? `Olá! Gostaria de agendar o serviço: ${serviceTitle}`
      : "Olá! Gostaria de agendar um horário.";
    return buildWhatsAppLink(whatsappNumber, msg);
  };

  return { isEnabled, loading, whatsappNumber, getWhatsAppUrl };
};
