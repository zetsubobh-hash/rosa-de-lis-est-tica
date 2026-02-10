import { motion } from "framer-motion";
import womanAbout from "@/assets/woman-about.webp";

const About = () => {
  return (
    <section id="sobre" className="py-20 md:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
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
              className="w-full max-w-md object-cover"
            />
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground mb-6 leading-tight">
              O que é{" "}
              <span className="text-pink-vibrant font-bold">Drenagem Linfática</span>?
            </h2>

            <div className="space-y-4 font-body text-muted-foreground leading-relaxed">
              <p>
                A drenagem linfática é uma técnica de massagem suave que estimula o sistema
                linfático — responsável por eliminar toxinas e líquidos em excesso do corpo.
              </p>
              <p>
                Ela ajuda a reduzir o inchaço, melhora a circulação, combate a retenção de
                líquidos e proporciona uma sensação profunda de bem-estar e leveza.
              </p>
              <p>
                Muito procurada também no pós-operatório e por quem deseja cuidar da saúde
                e da estética com delicadeza e eficácia.
              </p>
            </div>

            <motion.p
              className="mt-6 font-body text-primary font-semibold italic leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              Na Rosa de Lis, cada sessão de drenagem linfática é um convite para você se
              reconectar com seu corpo, aliviar o inchaço e sentir-se mais leve, mais bonita,
              mais você.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
