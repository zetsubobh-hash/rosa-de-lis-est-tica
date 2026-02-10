import { motion } from "framer-motion";
import heroSpa from "@/assets/hero-spa.jpg";

const Contact = () => {
  return (
    <section id="contato" className="relative py-24 md:py-32 bg-primary overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={heroSpa} alt="" className="w-full h-full object-cover opacity-15" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
            Descubra o tratamento
            <br />
            <span className="italic font-normal">ideal para você!</span>
          </h2>

          <p className="font-body text-primary-foreground/80 text-lg mb-4 font-semibold">
            Descubra o poder de se cuidar com carinho!
          </p>

          <p className="font-body text-primary-foreground/70 text-base mb-10 max-w-xl mx-auto leading-relaxed">
            Na Rosa de Lis Estética, cada tratamento é pensado para realçar sua beleza e
            bem-estar. Agende uma avaliação gratuita e conheça tudo o que preparamos para
            você se sentir ainda mais incrível!
          </p>

          <motion.a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-12 py-4 bg-primary-foreground text-primary font-body text-sm font-bold tracking-[0.15em] uppercase rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-500"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Quero agendar agora
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
