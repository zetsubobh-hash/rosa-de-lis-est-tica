import { motion } from "framer-motion";
import { Sparkles, Flower2, Heart, Gem } from "lucide-react";

const services = [
  {
    icon: Sparkles,
    title: "Limpeza de Pele",
    description: "Tratamento profundo para renovação e luminosidade da pele.",
  },
  {
    icon: Flower2,
    title: "Tratamentos Faciais",
    description: "Protocolos personalizados com ativos de alta performance.",
  },
  {
    icon: Heart,
    title: "Massoterapia",
    description: "Massagens relaxantes e terapêuticas para corpo e mente.",
  },
  {
    icon: Gem,
    title: "Estética Corporal",
    description: "Procedimentos para modelagem, firmeza e redução de medidas.",
  },
];

const Services = () => {
  return (
    <section id="servicos" className="py-24 md:py-32 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="text-gold font-body text-sm tracking-[0.35em] uppercase mb-3">
            Nossos serviços
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground">
            Cuidados Exclusivos
          </h2>
          <div className="w-16 h-px bg-gold mx-auto mt-6" />
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center group p-8 bg-card rounded-sm border border-border hover:border-gold/40 transition-all duration-500"
            >
              <div className="w-14 h-14 mx-auto mb-6 flex items-center justify-center border border-gold/30 rounded-full group-hover:border-gold transition-colors duration-500">
                <service.icon className="w-6 h-6 text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl text-foreground mb-3">{service.title}</h3>
              <p className="font-body text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
