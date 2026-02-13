import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import womanAbout from "@/assets/woman-about.webp";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const About = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);


  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
    } else if (isIOS) {
      toast.info('No iPhone/iPad, toque no ícone de compartilhar do Safari e depois em "Adicionar à Tela de Início".');
    } else {
      toast.info("Abra este site no navegador Chrome do seu celular para instalar o app.");
    }
  };

  return (
    <section id="sobre" className="py-16 md:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <img
              src={womanAbout}
              alt="Rosa de Lis - tratamentos estéticos"
              className="w-full max-w-sm md:max-w-md object-cover"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-body text-primary text-xs md:text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
              Sobre nós
            </p>
            <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl text-foreground mb-6 leading-tight font-bold">
              Conheça a{" "}
              <span className="text-pink-vibrant">Rosa de Lis</span>
            </h2>

            <div className="space-y-4 font-body text-muted-foreground text-sm md:text-base leading-relaxed">
              <p>
                A <strong className="text-foreground">Rosa de Lis Estética</strong> é uma clínica especializada em
                tratamentos estéticos corporais e faciais, dedicada a realçar a beleza natural de cada cliente.
              </p>
              <p>
                Contamos com profissionais qualificados e equipamentos de última geração para oferecer
                procedimentos como drenagem linfática, criolipólise, botox, carboxiterapia, peelings,
                massagens modeladoras, radiofrequência e muito mais.
              </p>
              <p>
                Nosso compromisso é proporcionar resultados reais com atendimento humanizado e
                personalizado, em um ambiente acolhedor pensado para o seu conforto e bem-estar.
              </p>
            </div>

            {!isInstalled && (
              <motion.div
                className="mt-8"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-primary-foreground font-body text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {installing ? "Instalando..." : "Baixe nosso app grátis"}
                </button>
                <p className="font-body text-xs text-muted-foreground mt-2.5">
                  Acesse seus agendamentos direto da tela inicial do celular
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
