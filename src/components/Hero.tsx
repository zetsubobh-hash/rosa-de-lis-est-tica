import { motion } from "framer-motion";
import logo from "@/assets/logo-branca.png";
import heroSpa from "@/assets/hero-spa.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-primary">
      {/* Background decorative image */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
        <img
          src={heroSpa}
          alt="Rosa de Lis Estética"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
      </div>

      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full border border-primary-foreground/10 hidden lg:block" />
      <div className="absolute bottom-20 right-40 w-48 h-48 rounded-full border border-primary-foreground/10 hidden lg:block" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.img
              src={logo}
              alt="Rosa de Lis"
              className="h-20 w-auto mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />

            <p className="font-body text-primary-foreground/70 text-sm tracking-[0.3em] uppercase mb-4 font-medium">
              Estética especializada em tratamentos corporais e faciais
            </p>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight mb-6">
              Drenagem
              <br />
              <span className="italic font-normal">Linfática</span>
            </h1>

            <p className="font-body text-primary-foreground/80 text-lg md:text-xl font-light max-w-lg mb-10 leading-relaxed">
              O melhor tratamento para combater a retenção de líquidos e transformar seu corpo.
            </p>

            <motion.a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 bg-primary-foreground text-primary font-body text-sm font-bold tracking-[0.15em] uppercase rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-500"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Quero agendar agora
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(0, 0%, 100%)"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
