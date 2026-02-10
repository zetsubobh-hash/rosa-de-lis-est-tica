import { motion } from "framer-motion";
import { Droplets, Heart, Activity, Smile, Sparkles, Leaf } from "lucide-react";

const benefits = [
  {
    icon: Droplets,
    title: "Redução de Inchaço",
    description:
      "Estimula a eliminação de líquidos retidos, promovendo alívio imediato da sensação de peso e desconforto.",
  },
  {
    icon: Activity,
    title: "Melhora da Circulação",
    description:
      "Ajuda o corpo a funcionar melhor, acelerando a remoção de toxinas e melhorando a circulação sanguínea e linfática.",
  },
  {
    icon: Heart,
    title: "Pós-operatório Saudável",
    description:
      "Auxilia na recuperação após cirurgias estéticas, reduzindo hematomas e acelerando a cicatrização.",
  },
  {
    icon: Smile,
    title: "Ação Relaxante",
    description:
      "Proporciona bem-estar físico e emocional, aliviando o estresse e a ansiedade do dia a dia.",
  },
  {
    icon: Sparkles,
    title: "Contorno Corporal",
    description:
      "Com a diminuição do inchaço, o corpo fica mais definido e leve, aperfeiçoando o contorno corporal.",
  },
  {
    icon: Leaf,
    title: "Melhora da Celulite",
    description:
      "Ajuda a suavizar o aspecto da celulite, especialmente quando combinada a outros tratamentos.",
  },
];

const Services = () => {
  return (
    <section id="beneficios" className="py-20 md:py-28 bg-rose-soft">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-body text-primary text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
            Benefícios
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">
            Quais os benefícios da{" "}
            <span className="text-pink-vibrant">Drenagem Linfática</span>?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-background rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 group border border-border hover:border-primary/30"
            >
              <div className="w-14 h-14 mb-5 flex items-center justify-center bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                <benefit.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-500" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              <p className="font-body text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
