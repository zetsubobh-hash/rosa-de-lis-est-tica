import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Rosa de Lis Estética - ambiente luxuoso"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <p className="text-gold font-body text-sm tracking-[0.35em] uppercase mb-4">
            Estética & Bem-estar
          </p>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-foreground leading-tight mb-6">
            Rosa de Lis
          </h1>
          <div className="w-20 h-px bg-gold mx-auto mb-6" />
          <p className="font-body text-muted-foreground text-lg md:text-xl font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Realce sua beleza natural com tratamentos personalizados em um ambiente de sofisticação e cuidado.
          </p>
          <motion.a
            href="#servicos"
            className="inline-block px-10 py-4 border border-gold text-gold font-body text-sm tracking-[0.2em] uppercase hover:bg-gold hover:text-primary-foreground transition-all duration-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Conheça nossos serviços
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
