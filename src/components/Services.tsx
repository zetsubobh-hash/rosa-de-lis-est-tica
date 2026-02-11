import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/hooks/useServices";
import { getIconByName } from "@/lib/iconMap";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

const Services = () => {
  const [clicked, setClicked] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { services, loading } = useServices();

  const handleClick = (slug: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setClicked(slug);
    setTimeout(() => {
      navigate(`/servico/${slug}`);
    }, 400);
  };

  return (
    <section id="servicos" className="py-20 md:py-28 bg-rose-soft">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-body text-primary text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
            Nossos Serviços
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">
            Tratamentos{" "}
            <span className="text-pink-vibrant">Estéticos Completos</span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 max-w-xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary font-body text-sm md:text-base font-medium text-primary-foreground">
              Toque em um serviço abaixo para <span className="font-semibold">agendar</span>
            </span>
          </motion.p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {services.map((service, i) => {
            const isSelected = clicked === service.slug;
            const IconComponent = getIconByName(service.icon_name);
            return (
              <motion.div
                key={service.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                onClick={() => handleClick(service.slug)}
                className={`group relative rounded-2xl p-5 md:p-6 cursor-pointer overflow-hidden border-2 transition-all duration-300 h-full select-none ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-inner scale-[0.97]"
                    : "bg-background border-transparent hover:border-primary/20 hover:shadow-lg"
                }`}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-20"
                    >
                      <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-vibrant/5 transition-opacity duration-500 rounded-2xl ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`} />

                <div className="relative z-10">
                  <div className={`w-10 h-10 md:w-11 md:h-11 mb-4 flex items-center justify-center rounded-full transition-all duration-500 ${
                    isSelected
                      ? "bg-primary"
                      : "bg-primary/10 group-hover:bg-primary"
                  }`}>
                    <IconComponent
                      className={`w-5 h-5 transition-colors duration-500 ${
                        isSelected
                          ? "text-primary-foreground"
                          : "text-primary group-hover:text-primary-foreground"
                      }`}
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="font-heading text-sm md:text-base font-semibold text-foreground mb-2 leading-tight">
                    {service.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-xs md:text-[13px] leading-relaxed line-clamp-3">
                    {service.short_description}
                  </p>
                </div>

                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-primary to-pink-vibrant transition-all duration-500 rounded-full ${
                  isSelected ? "w-3/4" : "w-0 group-hover:w-3/4"
                }`} />
              </motion.div>
            );
          })}
        </div>
        )}

      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </section>
  );
};

export default Services;
