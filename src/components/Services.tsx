import { motion } from "framer-motion";
import {
  Droplets,
  Heart,
  Activity,
  Smile,
  Sparkles,
  Leaf,
  Snowflake,
  Syringe,
  Wind,
  CircleDot,
  HandMetal,
  Gem,
  Zap,
  Sun,
  ShieldCheck,
  Waves,
} from "lucide-react";

const services = [
  {
    icon: Droplets,
    title: "Drenagem Linfática",
    description:
      "Técnica manual que estimula o sistema linfático, reduzindo inchaço, retenção de líquidos e toxinas. Ideal para pós-operatório, gestantes e bem-estar geral.",
  },
  {
    icon: Snowflake,
    title: "Criolipólise",
    description:
      "Procedimento não invasivo que congela e elimina células de gordura localizada. Resultados visíveis e duradouros sem necessidade de cirurgia.",
  },
  {
    icon: Syringe,
    title: "Botox",
    description:
      "Aplicação de toxina botulínica para suavizar rugas e linhas de expressão, proporcionando um aspecto rejuvenescido e natural ao rosto.",
  },
  {
    icon: Wind,
    title: "Carboxiterapia",
    description:
      "Infusão de gás carbônico sob a pele para melhorar a circulação, tratar celulite, estrias e gordura localizada com resultados comprovados.",
  },
  {
    icon: Gem,
    title: "Peeling de Diamante",
    description:
      "Esfoliação mecânica com ponteiras diamantadas que remove células mortas, estimula a renovação celular e deixa a pele luminosa e uniforme.",
  },
  {
    icon: CircleDot,
    title: "Peeling de Cristal",
    description:
      "Microdermoabrasão com microcristais de óxido de alumínio para tratar manchas, cicatrizes de acne e melhorar a textura da pele.",
  },
  {
    icon: HandMetal,
    title: "Massagem Redutora",
    description:
      "Técnica de movimentos firmes e rápidos que quebra moléculas de gordura, reduz medidas e modela o contorno corporal de forma natural.",
  },
  {
    icon: Waves,
    title: "Massagem Modeladora",
    description:
      "Combina manobras de drenagem e modelagem para esculpir o corpo, definir curvas e melhorar a firmeza da pele.",
  },
  {
    icon: Sun,
    title: "Limpeza de Pele",
    description:
      "Procedimento completo de higienização profunda que remove cravos, miliums e impurezas, deixando a pele limpa, macia e renovada.",
  },
  {
    icon: Sparkles,
    title: "Microagulhamento",
    description:
      "Estímulo à produção de colágeno através de microagulhas, tratando cicatrizes, rugas finas, poros dilatados e flacidez.",
  },
  {
    icon: Zap,
    title: "Radiofrequência",
    description:
      "Aquecimento controlado das camadas profundas da pele para estimular colágeno, combater flacidez e promover rejuvenescimento facial e corporal.",
  },
  {
    icon: ShieldCheck,
    title: "Protocolo Pós-Operatório",
    description:
      "Programa completo de cuidados após cirurgias estéticas, combinando drenagem, ultrassom e terapias para acelerar a recuperação.",
  },
];

const Services = () => {
  return (
    <section id="servicos" className="py-20 md:py-28 bg-rose-soft">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-body text-primary text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
            Nossos Serviços
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">
            Tratamentos{" "}
            <span className="text-pink-vibrant">Estéticos Completos</span>
          </h2>
          <p className="font-body text-muted-foreground mt-4 max-w-2xl mx-auto text-base md:text-lg">
            Oferecemos uma linha completa de procedimentos estéticos faciais e corporais, sempre com foco no seu bem-estar e nos melhores resultados.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="bg-background rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 group border border-border hover:border-primary/30"
            >
              <div className="w-14 h-14 mb-5 flex items-center justify-center bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                <service.icon
                  className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-500"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                {service.title}
              </h3>
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
