import { motion } from "framer-motion";
import womanPointing from "@/assets/woman-pointing.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-primary">
      {/* Decorative circles */}
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full border border-primary-foreground/10 hidden lg:block" />
      <div className="absolute bottom-20 right-40 w-48 h-48 rounded-full border border-primary-foreground/10 hidden lg:block" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full text-center lg:text-left">
        <div className="max-w-2xl mx-auto lg:mx-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <p className="font-body text-primary-foreground/70 text-sm tracking-[0.3em] uppercase mb-6 font-medium">
              Estética especializada em tratamentos corporais e faciais
            </p>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Drenagem Linfática
            </h1>

            <p className="font-body text-primary-foreground/80 font-normal max-w-lg mx-auto lg:mx-0 mb-10" style={{ fontSize: '25px', lineHeight: '35px' }}>
              O melhor tratamento para combater a retenção de líquidos.
            </p>

            <motion.a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 border-2 border-primary-foreground text-primary-foreground font-body text-sm font-semibold tracking-[0.2em] uppercase rounded-full hover:bg-primary-foreground hover:text-primary transition-all duration-500"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Quero agora mesmo
            </motion.a>
          </motion.div>
        </div>
      </div>

      {/* Woman image on the right, legs aligned to bottom */}
      <div className="absolute right-0 bottom-0 hidden lg:flex items-end justify-end h-full">
        <motion.img
          src={womanPointing}
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
