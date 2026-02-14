import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const WhatsAppButton = () => {
  const { settings, loading } = useSiteSettings();
  const whatsappNumber = settings.whatsapp_number;

  if (loading || !whatsappNumber) return null;

  return (
    <motion.a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" fill="white" />
    </motion.a>
  );
};

export default WhatsAppButton;
