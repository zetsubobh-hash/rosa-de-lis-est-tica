import { useSiteSettings } from "@/hooks/useSiteSettings";

export const useOnlineBooking = () => {
  const { settings, loading } = useSiteSettings();

  const isEnabled = (settings.online_booking_enabled ?? "true") === "true";
  const whatsappNumber = settings.whatsapp_number || "";

  const getWhatsAppUrl = (serviceTitle?: string) => {
    const msg = serviceTitle
      ? `Olá! Gostaria de agendar o serviço: ${serviceTitle}`
      : "Olá! Gostaria de agendar um horário.";
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  return { isEnabled, loading, whatsappNumber, getWhatsAppUrl };
};
