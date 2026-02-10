import { motion } from "framer-motion";
import { MapPin, Phone, Clock } from "lucide-react";

const Contact = () => {
  return (
    <section id="contato" className="py-24 md:py-32 bg-background">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-gold font-body text-sm tracking-[0.35em] uppercase mb-3">
            Contato
          </p>
          <h2 className="font-heading text-4xl md:text-5xl font-light text-foreground mb-6">
            Agende sua Visita
          </h2>
          <div className="w-16 h-px bg-gold mx-auto mb-12" />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: MapPin,
              title: "Endereço",
              detail: "Rua das Flores, 123\nCentro — Sua Cidade",
            },
            {
              icon: Phone,
              title: "Telefone",
              detail: "(11) 99999-9999",
            },
            {
              icon: Clock,
              title: "Horário",
              detail: "Seg a Sex: 9h — 19h\nSáb: 9h — 14h",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="p-8"
            >
              <div className="w-12 h-12 mx-auto mb-5 flex items-center justify-center border border-gold/30 rounded-full">
                <item.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-lg text-foreground mb-2">{item.title}</h3>
              <p className="font-body text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
                {item.detail}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-12 py-4 bg-primary text-primary-foreground font-body text-sm tracking-[0.2em] uppercase hover:opacity-90 transition-opacity duration-300"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Agendar pelo WhatsApp
        </motion.a>
      </div>
    </section>
  );
};

export default Contact;
