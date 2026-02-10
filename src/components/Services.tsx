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
          <p className="font-body text-muted-foreground mt-4 max-w-2xl mx-auto text-sm md:text-lg leading-relaxed">
            Oferecemos uma linha completa de procedimentos estéticos faciais e corporais, sempre com foco no seu bem-estar e nos melhores resultados.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative bg-background rounded-2xl p-5 md:p-6 cursor-pointer overflow-hidden border border-transparent hover:border-primary/20 transition-all duration-500 hover:shadow-lg"
            >
              {/* Decorative gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-vibrant/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

              <div className="relative z-10">
                <div className="w-10 h-10 md:w-11 md:h-11 mb-4 flex items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary transition-all duration-500">
                  <service.icon
                    className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors duration-500"
                    strokeWidth={1.8}
                  />
                </div>
                <h3 className="font-heading text-sm md:text-base font-semibold text-foreground mb-2 leading-tight">
                  {service.title}
                </h3>
                <p className="font-body text-muted-foreground text-xs md:text-[13px] leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                  {service.description}
                </p>
              </div>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-primary to-pink-vibrant group-hover:w-3/4 transition-all duration-500 rounded-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
