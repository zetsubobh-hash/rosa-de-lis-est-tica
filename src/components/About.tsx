import { motion } from "framer-motion";
import womanAbout from "@/assets/woman-about.webp";

const About = () => {
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

            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <a
                href="#servicos"
                className="inline-block text-center px-8 py-3 bg-primary text-primary-foreground font-body text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-primary/90 transition-all duration-300"
              >
                Nossos serviços
              </a>
              <a
                href="#contato"
                className="inline-block text-center px-8 py-3 border-2 border-primary text-primary font-body text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Fale conosco
              </a>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
