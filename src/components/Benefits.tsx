import { motion } from "framer-motion";
import { Droplets, Heart, Activity, Smile, Sparkles, Leaf, ShieldCheck, Zap } from "lucide-react";

const benefits = [
  {
    icon: Droplets,
    title: "Redução de Inchaço",
    description: "Estimula a eliminação de líquidos retidos, aliviando o peso e desconforto.",
  },
  {
    icon: Activity,
    title: "Melhora da Circulação",
    description: "Acelera a remoção de toxinas e melhora a circulação sanguínea e linfática.",
  },
  {
    icon: Heart,
    title: "Pós-operatório Saudável",
    description: "Reduz hematomas e acelera a cicatrização após cirurgias estéticas.",
  },
  {
    icon: Smile,
    title: "Bem-estar e Relaxamento",
    description: "Proporciona alívio do estresse e ansiedade com efeito relaxante profundo.",
  },
  {
    icon: Sparkles,
    title: "Pele Rejuvenescida",
    description: "Estimula colágeno e renova as células para uma pele mais firme e luminosa.",
  },
  {
    icon: Leaf,
    title: "Resultados Naturais",
    description: "Tratamentos que respeitam o corpo, com resultados harmônicos e naturais.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e Confiança",
    description: "Profissionais qualificados e equipamentos de última geração para sua segurança.",
  },
  {
    icon: Zap,
    title: "Tecnologia Avançada",
    description: "As melhores técnicas e aparelhos do mercado para resultados comprovados.",
  },
];

const Benefits = () => {
  return (
    <section id="beneficios" className="py-16 md:py-28 bg-background">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="font-body text-primary text-xs md:text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
            Por que nos escolher
          </p>
          <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Benefícios dos nossos{" "}
            <span className="text-pink-vibrant">tratamentos</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="text-center p-4 md:p-6"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-4 flex items-center justify-center bg-primary/10 rounded-full">
                <benefit.icon
                  className="w-6 h-6 md:w-7 md:h-7 text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-heading text-sm md:text-base font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="font-body text-muted-foreground text-xs md:text-sm leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
