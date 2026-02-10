import { motion } from "framer-motion";

const About = () => {
  return (
    <section id="sobre" className="py-24 md:py-32 bg-rose-light">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gold font-body text-sm tracking-[0.35em] uppercase mb-3">
              Sobre nós
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground mb-6">
              Beleza que Transforma
            </h2>
            <div className="w-16 h-px bg-gold mb-8" />
            <p className="font-body text-muted-foreground leading-relaxed mb-6">
              Na Rosa de Lis, acreditamos que cada pessoa possui uma beleza única que merece ser
              celebrada. Nosso espaço foi cuidadosamente pensado para proporcionar uma experiência
              de bem-estar completa.
            </p>
            <p className="font-body text-muted-foreground leading-relaxed">
              Com profissionais qualificados e tecnologia de ponta, oferecemos tratamentos
              personalizados que unem ciência e sofisticação para resultados que encantam.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col gap-6"
          >
            {[
              { number: "10+", label: "Anos de experiência" },
              { number: "5.000+", label: "Clientes atendidos" },
              { number: "20+", label: "Tratamentos disponíveis" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-6 p-6 bg-background/60 backdrop-blur-sm rounded-sm border border-border"
              >
                <span className="font-heading text-3xl text-gold">{stat.number}</span>
                <span className="font-body text-muted-foreground text-sm tracking-wide">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
