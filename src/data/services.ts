import {
  Droplets,
  Snowflake,
  Syringe,
  Wind,
  Gem,
  CircleDot,
  HandMetal,
  Waves,
  Sun,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";

export interface ServiceData {
  slug: string;
  icon: typeof Droplets;
  title: string;
  shortDescription: string;
  fullDescription: string;
  benefits: string[];
  duration: string;
  price: string;
  sessions: string;
}

export const services: ServiceData[] = [
  {
    slug: "drenagem-linfatica",
    icon: Droplets,
    title: "Drenagem Linfática",
    shortDescription:
      "Técnica manual que estimula o sistema linfático, reduzindo inchaço, retenção de líquidos e toxinas. Ideal para pós-operatório, gestantes e bem-estar geral.",
    fullDescription:
      "A Drenagem Linfática é uma técnica de massagem suave e ritmada que atua diretamente no sistema linfático, promovendo a eliminação de toxinas, redução de edemas e melhora da circulação. É um dos tratamentos mais procurados para pós-operatório, gestantes e quem busca bem-estar e leveza no dia a dia. Nossos profissionais utilizam protocolos personalizados para cada paciente, garantindo resultados visíveis desde a primeira sessão.",
    benefits: [
      "Redução de inchaço e retenção de líquidos",
      "Eliminação de toxinas do organismo",
      "Melhora da circulação sanguínea e linfática",
      "Alívio de dores e sensação de peso nas pernas",
      "Auxílio na recuperação pós-operatória",
      "Relaxamento profundo e bem-estar",
    ],
    duration: "60 minutos",
    price: "A partir de R$ 150,00",
    sessions: "Recomendamos pacotes de 10 sessões",
  },
  {
    slug: "criolipólise",
    icon: Snowflake,
    title: "Criolipólise",
    shortDescription:
      "Procedimento não invasivo que congela e elimina células de gordura localizada. Resultados visíveis e duradouros sem necessidade de cirurgia.",
    fullDescription:
      "A Criolipólise é um procedimento revolucionário que utiliza resfriamento controlado para destruir células de gordura localizada de forma definitiva. O tratamento é seguro, não invasivo e não requer tempo de recuperação. É ideal para pessoas que desejam eliminar gordurinhas resistentes ao exercício físico e dieta, como abdômen, flancos, costas e coxas.",
    benefits: [
      "Eliminação definitiva de células de gordura",
      "Procedimento indolor e não invasivo",
      "Sem tempo de recuperação",
      "Resultados visíveis em 30 a 60 dias",
      "Modelagem do contorno corporal",
      "Seguro e aprovado pela ANVISA",
    ],
    duration: "40 a 60 minutos por área",
    price: "A partir de R$ 500,00",
    sessions: "1 a 3 sessões por área",
  },
  {
    slug: "botox",
    icon: Syringe,
    title: "Botox",
    shortDescription:
      "Aplicação de toxina botulínica para suavizar rugas e linhas de expressão, proporcionando um aspecto rejuvenescido e natural ao rosto.",
    fullDescription:
      "O Botox é o tratamento estético mais realizado no mundo para suavização de rugas e linhas de expressão. Utilizamos toxina botulínica de alta qualidade, aplicada com precisão para garantir um resultado natural e harmonioso. O procedimento é rápido, seguro e os efeitos são visíveis em poucos dias, proporcionando uma aparência rejuvenescida e descansada.",
    benefits: [
      "Suavização de rugas e linhas de expressão",
      "Prevenção do envelhecimento precoce",
      "Resultado natural e harmonioso",
      "Procedimento rápido (15-30 minutos)",
      "Sem tempo de recuperação",
      "Efeito duradouro de 4 a 6 meses",
    ],
    duration: "15 a 30 minutos",
    price: "A partir de R$ 800,00",
    sessions: "Manutenção a cada 4-6 meses",
  },
  {
    slug: "carboxiterapia",
    icon: Wind,
    title: "Carboxiterapia",
    shortDescription:
      "Infusão de gás carbônico sob a pele para melhorar a circulação, tratar celulite, estrias e gordura localizada com resultados comprovados.",
    fullDescription:
      "A Carboxiterapia consiste na infusão controlada de gás carbônico (CO₂) sob a pele, promovendo vasodilatação e aumento da oxigenação tecidual. É um tratamento versátil, indicado para celulite, estrias, gordura localizada, olheiras e flacidez. Os resultados são progressivos e comprovados cientificamente.",
    benefits: [
      "Melhora significativa da celulite",
      "Tratamento eficaz de estrias",
      "Redução de gordura localizada",
      "Melhora da oxigenação dos tecidos",
      "Estímulo à produção de colágeno",
      "Resultados comprovados cientificamente",
    ],
    duration: "20 a 40 minutos",
    price: "A partir de R$ 200,00",
    sessions: "Pacote de 10 a 20 sessões",
  },
  {
    slug: "peeling-de-diamante",
    icon: Gem,
    title: "Peeling de Diamante",
    shortDescription:
      "Esfoliação mecânica com ponteiras diamantadas que remove células mortas, estimula a renovação celular e deixa a pele luminosa e uniforme.",
    fullDescription:
      "O Peeling de Diamante é um procedimento de microdermoabrasão que utiliza ponteiras com microcristais de diamante para esfoliar a camada superficial da pele. O tratamento remove células mortas, estimula a renovação celular e melhora a textura e luminosidade da pele. É indicado para todos os tipos de pele e pode ser realizado em qualquer época do ano.",
    benefits: [
      "Renovação celular acelerada",
      "Pele mais luminosa e uniforme",
      "Redução de manchas superficiais",
      "Melhora da textura da pele",
      "Desobstrução dos poros",
      "Potencializa absorção de ativos",
    ],
    duration: "30 a 45 minutos",
    price: "A partir de R$ 180,00",
    sessions: "Pacote de 4 a 6 sessões",
  },
  {
    slug: "peeling-de-cristal",
    icon: CircleDot,
    title: "Peeling de Cristal",
    shortDescription:
      "Microdermoabrasão com microcristais de óxido de alumínio para tratar manchas, cicatrizes de acne e melhorar a textura da pele.",
    fullDescription:
      "O Peeling de Cristal utiliza jatos de microcristais de óxido de alumínio para promover uma esfoliação profunda e controlada da pele. É especialmente indicado para tratamento de manchas, cicatrizes de acne, rugas finas e para melhorar a textura geral da pele. O procedimento é seguro e oferece resultados visíveis já na primeira sessão.",
    benefits: [
      "Tratamento de manchas e cicatrizes",
      "Redução de rugas finas",
      "Melhora da textura da pele",
      "Estímulo à produção de colágeno",
      "Resultados desde a primeira sessão",
      "Indicado para diversos tipos de pele",
    ],
    duration: "30 a 45 minutos",
    price: "A partir de R$ 180,00",
    sessions: "Pacote de 4 a 6 sessões",
  },
  {
    slug: "massagem-redutora",
    icon: HandMetal,
    title: "Massagem Redutora",
    shortDescription:
      "Técnica de movimentos firmes e rápidos que quebra moléculas de gordura, reduz medidas e modela o contorno corporal de forma natural.",
    fullDescription:
      "A Massagem Redutora utiliza movimentos firmes, rápidos e profundos para ativar a circulação, quebrar moléculas de gordura e promover a redução de medidas. É um tratamento eficaz para modelar o contorno corporal, combater celulite e melhorar a firmeza da pele. Resultados potencializados quando combinado com alimentação equilibrada e exercícios.",
    benefits: [
      "Redução de medidas corporais",
      "Modelagem do contorno corporal",
      "Melhora da circulação local",
      "Combate à celulite",
      "Melhora da firmeza da pele",
      "Sensação de leveza e bem-estar",
    ],
    duration: "50 a 60 minutos",
    price: "A partir de R$ 130,00",
    sessions: "Pacote de 10 a 15 sessões",
  },
  {
    slug: "massagem-modeladora",
    icon: Waves,
    title: "Massagem Modeladora",
    shortDescription:
      "Combina manobras de drenagem e modelagem para esculpir o corpo, definir curvas e melhorar a firmeza da pele.",
    fullDescription:
      "A Massagem Modeladora combina técnicas de drenagem linfática e movimentos de modelagem para esculpir o corpo, definir curvas e melhorar a firmeza da pele. É indicada para quem deseja um contorno corporal mais definido e uma pele mais firme e tonificada. Nossos profissionais personalizam o protocolo conforme as necessidades de cada paciente.",
    benefits: [
      "Esculpir e definir curvas corporais",
      "Melhora da firmeza e tônus da pele",
      "Redução de celulite e irregularidades",
      "Ativação da circulação sanguínea",
      "Eliminação de toxinas",
      "Protocolo personalizado por paciente",
    ],
    duration: "50 a 60 minutos",
    price: "A partir de R$ 140,00",
    sessions: "Pacote de 10 sessões",
  },
  {
    slug: "limpeza-de-pele",
    icon: Sun,
    title: "Limpeza de Pele",
    shortDescription:
      "Procedimento completo de higienização profunda que remove cravos, miliums e impurezas, deixando a pele limpa, macia e renovada.",
    fullDescription:
      "A Limpeza de Pele é um procedimento essencial para manter a saúde e beleza da pele. Inclui etapas de higienização, esfoliação, extração de cravos e miliums, tonificação e hidratação. Utilizamos produtos de alta qualidade e técnicas seguras para garantir uma pele limpa, macia e radiante. Recomendada mensalmente para todos os tipos de pele.",
    benefits: [
      "Remoção de cravos e impurezas",
      "Desobstrução completa dos poros",
      "Pele mais limpa e luminosa",
      "Prevenção de acne e espinhas",
      "Hidratação profunda",
      "Renovação e vitalidade da pele",
    ],
    duration: "60 a 90 minutos",
    price: "A partir de R$ 120,00",
    sessions: "Manutenção mensal recomendada",
  },
  {
    slug: "microagulhamento",
    icon: Sparkles,
    title: "Microagulhamento",
    shortDescription:
      "Estímulo à produção de colágeno através de microagulhas, tratando cicatrizes, rugas finas, poros dilatados e flacidez.",
    fullDescription:
      "O Microagulhamento é uma técnica que utiliza um dispositivo com microagulhas para criar microperfurações na pele, estimulando a produção natural de colágeno e elastina. É altamente eficaz no tratamento de cicatrizes de acne, rugas finas, poros dilatados, estrias e flacidez. Os resultados são progressivos e duradouros, com melhora visível da textura e firmeza da pele.",
    benefits: [
      "Estímulo à produção de colágeno",
      "Tratamento de cicatrizes de acne",
      "Redução de rugas finas e poros dilatados",
      "Melhora de estrias e flacidez",
      "Resultados progressivos e duradouros",
      "Potencializa absorção de ativos",
    ],
    duration: "40 a 60 minutos",
    price: "A partir de R$ 350,00",
    sessions: "Pacote de 3 a 6 sessões",
  },
  {
    slug: "radiofrequencia",
    icon: Zap,
    title: "Radiofrequência",
    shortDescription:
      "Aquecimento controlado das camadas profundas da pele para estimular colágeno, combater flacidez e promover rejuvenescimento facial e corporal.",
    fullDescription:
      "A Radiofrequência é um tratamento que utiliza ondas eletromagnéticas para aquecer as camadas profundas da pele de forma controlada, estimulando a produção de colágeno e elastina. É um dos tratamentos mais eficazes para combater flacidez facial e corporal, promovendo rejuvenescimento e firmeza. Os resultados são cumulativos e duradouros.",
    benefits: [
      "Combate eficaz à flacidez",
      "Estímulo à produção de colágeno e elastina",
      "Rejuvenescimento facial e corporal",
      "Melhora do contorno facial",
      "Resultados cumulativos e duradouros",
      "Procedimento confortável e seguro",
    ],
    duration: "30 a 50 minutos",
    price: "A partir de R$ 250,00",
    sessions: "Pacote de 6 a 10 sessões",
  },
  {
    slug: "protocolo-pos-operatorio",
    icon: ShieldCheck,
    title: "Protocolo Pós-Operatório",
    shortDescription:
      "Programa completo de cuidados após cirurgias estéticas, combinando drenagem, ultrassom e terapias para acelerar a recuperação.",
    fullDescription:
      "O Protocolo Pós-Operatório é um programa completo e personalizado de cuidados após cirurgias estéticas, como lipoaspiração, abdominoplastia e mamoplastia. Combina técnicas de drenagem linfática, ultrassom terapêutico, endermoterapia e outras terapias para acelerar a recuperação, reduzir edema, prevenir fibroses e garantir os melhores resultados do procedimento cirúrgico.",
    benefits: [
      "Recuperação mais rápida e confortável",
      "Redução significativa do edema",
      "Prevenção e tratamento de fibroses",
      "Melhora da cicatrização",
      "Alívio de dores e desconfortos",
      "Resultados otimizados da cirurgia",
    ],
    duration: "60 a 90 minutos",
    price: "A partir de R$ 200,00",
    sessions: "Conforme orientação médica",
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return services.find((s) => s.slug === slug);
}
