import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import referenceHero from "@/assets/reference-hero.webp";
import { useBrandingLogos } from "@/hooks/useBrandingLogos";
import { BackgroundPaths } from "@/components/ui/background-paths";
const slides = [
  { title: "Drenagem Linfática", subtitle: "O melhor tratamento para combater a retenção de líquidos.", slug: "drenagem-linfatica" },
  { title: "Criolipólise", subtitle: "Elimine gordura localizada sem cirurgia, com resultados visíveis.", slug: "criolipolise" },
  { title: "Botox", subtitle: "Suavize rugas e linhas de expressão com aspecto natural.", slug: "botox" },
  { title: "Carboxiterapia", subtitle: "Melhore circulação e trate celulite com tecnologia avançada.", slug: "carboxiterapia" },
  { title: "Massagem Modeladora", subtitle: "Esculpa o corpo e defina suas curvas de forma natural.", slug: "massagem-modeladora" },
  { title: "Peeling de Diamante", subtitle: "Renove sua pele e conquiste uma aparência luminosa e uniforme.", slug: "peeling-de-diamante" },
  { title: "Radiofrequência", subtitle: "Combata a flacidez e estimule colágeno para rejuvenescer.", slug: "radiofrequencia" },
  { title: "Microagulhamento", subtitle: "Estimule colágeno e trate cicatrizes com precisão.", slug: "microagulhamento" },
];

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { logoWhite } = useBrandingLogos();

  const handleAgendar = () => {
    navigate(`/servico/${slides[current].slug}`);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden bg-primary pt-20 md:pt-0">
      {/* Animated background paths */}
      <BackgroundPaths />

      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full border border-primary-foreground/10 hidden lg:block" />
      <div className="absolute bottom-20 right-40 w-48 h-48 rounded-full border border-primary-foreground/10 hidden lg:block" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-6 w-full text-left">
        <div className="max-w-2xl mx-auto lg:mx-0">
          <motion.img
            src={logoWhite}
            alt="Rosa de Lis"
            className="h-24 mx-auto md:h-20 md:mx-0 w-auto mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="font-body text-primary-foreground/70 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] uppercase mb-4 md:mb-6 font-medium"
          >
            Estética especializada em tratamentos corporais e faciais
          </motion.p>

          {/* Rotating text area */}
          <div className="h-[140px] md:h-[200px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-4 md:mb-6">
                  {slides[current].title}
                </h1>
                <p className="font-body text-primary-foreground/80 font-normal max-w-lg text-base md:text-[25px] md:leading-[35px] leading-relaxed">
                  {slides[current].subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide indicators */}
          <div className="flex gap-1.5 md:gap-2 mb-6 md:mb-8 justify-start flex-wrap">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === current
                    ? "w-6 md:w-8 bg-primary-foreground"
                    : "w-2.5 md:w-3 bg-primary-foreground/30 hover:bg-primary-foreground/50"
                }`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>

          <motion.button
            onClick={handleAgendar}
            className="inline-block px-8 md:px-10 py-3.5 md:py-4 border-2 border-primary-foreground text-primary-foreground font-body text-xs md:text-sm font-semibold tracking-[0.15em] md:tracking-[0.2em] uppercase rounded-full hover:bg-primary-foreground hover:text-primary transition-all duration-500"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Quero agora mesmo
          </motion.button>
        </div>
      </div>

      {/* Woman image on the right, legs aligned to bottom */}
      <div className="absolute right-0 bottom-0 hidden lg:flex items-end justify-end h-full">
        <motion.img
          src={referenceHero}
          alt="Rosa de Lis Estética"
          className="h-[85%] w-auto object-contain object-bottom"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </div>

      
    </section>
  );
};

export default Hero;
