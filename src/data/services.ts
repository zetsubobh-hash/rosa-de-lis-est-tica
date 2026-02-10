import drenagemImg from "@/assets/drenagem-linfatica.png";
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

export interface ServicePackage {
  name: string;
  sessions: number;
  pricePerSession: string;
  totalPrice: string;
  highlight?: boolean;
  perks: string[];
}

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
  image?: string;
  packages?: ServicePackage[];
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 5,
        pricePerSession: "R$ 150,00",
        totalPrice: "R$ 750,00",
        perks: [
          "5 sessões de 60 minutos",
          "Avaliação corporal inicial",
          "Técnica manual clássica",
        ],
      },
      {
        name: "Premium",
        sessions: 10,
        pricePerSession: "R$ 130,00",
        totalPrice: "R$ 1.300,00",
        highlight: true,
        perks: [
          "10 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Técnica manual + bambuterapia",
          "Aromaterapia inclusa",
          "13% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 20,
        pricePerSession: "R$ 110,00",
        totalPrice: "R$ 2.200,00",
        perks: [
          "20 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Técnica manual + bambuterapia",
          "Aromaterapia + crioterapia",
          "Acompanhamento nutricional",
          "27% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 1,
        pricePerSession: "R$ 500,00",
        totalPrice: "R$ 500,00",
        perks: [
          "1 sessão por área",
          "Avaliação corporal inicial",
          "Acompanhamento pós-procedimento",
        ],
      },
      {
        name: "Premium",
        sessions: 2,
        pricePerSession: "R$ 450,00",
        totalPrice: "R$ 900,00",
        highlight: true,
        perks: [
          "2 sessões por área",
          "Avaliação corporal completa",
          "Drenagem linfática pós-sessão",
          "10% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 3,
        pricePerSession: "R$ 400,00",
        totalPrice: "R$ 1.200,00",
        perks: [
          "3 sessões por área",
          "Avaliação corporal completa",
          "Drenagem linfática pós-sessão",
          "Acompanhamento nutricional",
          "20% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 1,
        pricePerSession: "R$ 800,00",
        totalPrice: "R$ 800,00",
        perks: [
          "1 aplicação",
          "Avaliação facial inicial",
          "Acompanhamento pós-aplicação",
        ],
      },
      {
        name: "Premium",
        sessions: 2,
        pricePerSession: "R$ 700,00",
        totalPrice: "R$ 1.400,00",
        highlight: true,
        perks: [
          "2 aplicações (semestral)",
          "Avaliação facial completa",
          "Limpeza de pele inclusa",
          "12% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 3,
        pricePerSession: "R$ 650,00",
        totalPrice: "R$ 1.950,00",
        perks: [
          "3 aplicações (anual)",
          "Avaliação facial completa",
          "Limpeza de pele + hidratação",
          "Acompanhamento personalizado",
          "19% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 5,
        pricePerSession: "R$ 200,00",
        totalPrice: "R$ 1.000,00",
        perks: [
          "5 sessões de 30 minutos",
          "Avaliação corporal inicial",
          "Protocolo padrão",
        ],
      },
      {
        name: "Premium",
        sessions: 10,
        pricePerSession: "R$ 170,00",
        totalPrice: "R$ 1.700,00",
        highlight: true,
        perks: [
          "10 sessões de 30 minutos",
          "Avaliação corporal completa",
          "Protocolo personalizado",
          "Drenagem linfática inclusa",
          "15% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 20,
        pricePerSession: "R$ 150,00",
        totalPrice: "R$ 3.000,00",
        perks: [
          "20 sessões de 40 minutos",
          "Avaliação corporal completa",
          "Protocolo personalizado",
          "Drenagem + massagem modeladora",
          "Acompanhamento nutricional",
          "25% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 3,
        pricePerSession: "R$ 180,00",
        totalPrice: "R$ 540,00",
        perks: [
          "3 sessões de 40 minutos",
          "Avaliação de pele inicial",
          "Hidratação pós-peeling",
        ],
      },
      {
        name: "Premium",
        sessions: 6,
        pricePerSession: "R$ 155,00",
        totalPrice: "R$ 930,00",
        highlight: true,
        perks: [
          "6 sessões de 45 minutos",
          "Avaliação de pele completa",
          "Máscara revitalizante inclusa",
          "Protetor solar de brinde",
          "14% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 10,
        pricePerSession: "R$ 135,00",
        totalPrice: "R$ 1.350,00",
        perks: [
          "10 sessões de 45 minutos",
          "Avaliação de pele completa",
          "Máscara + sérum vitamina C",
          "Kit skincare de brinde",
          "Acompanhamento dermatológico",
          "25% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 3,
        pricePerSession: "R$ 180,00",
        totalPrice: "R$ 540,00",
        perks: [
          "3 sessões de 40 minutos",
          "Avaliação de pele inicial",
          "Hidratação pós-peeling",
        ],
      },
      {
        name: "Premium",
        sessions: 6,
        pricePerSession: "R$ 155,00",
        totalPrice: "R$ 930,00",
        highlight: true,
        perks: [
          "6 sessões de 45 minutos",
          "Avaliação de pele completa",
          "Máscara revitalizante inclusa",
          "Protetor solar de brinde",
          "14% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 10,
        pricePerSession: "R$ 135,00",
        totalPrice: "R$ 1.350,00",
        perks: [
          "10 sessões de 45 minutos",
          "Avaliação de pele completa",
          "Máscara + sérum vitamina C",
          "Kit skincare de brinde",
          "Acompanhamento dermatológico",
          "25% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 5,
        pricePerSession: "R$ 130,00",
        totalPrice: "R$ 650,00",
        perks: [
          "5 sessões de 50 minutos",
          "Avaliação corporal inicial",
          "Técnica manual clássica",
        ],
      },
      {
        name: "Premium",
        sessions: 10,
        pricePerSession: "R$ 115,00",
        totalPrice: "R$ 1.150,00",
        highlight: true,
        perks: [
          "10 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Massagem + drenagem combinada",
          "Creme redutor incluso",
          "12% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 15,
        pricePerSession: "R$ 100,00",
        totalPrice: "R$ 1.500,00",
        perks: [
          "15 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Massagem + drenagem + modeladora",
          "Creme redutor + esfoliante",
          "Acompanhamento nutricional",
          "23% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 5,
        pricePerSession: "R$ 140,00",
        totalPrice: "R$ 700,00",
        perks: [
          "5 sessões de 50 minutos",
          "Avaliação corporal inicial",
          "Protocolo modelador padrão",
        ],
      },
      {
        name: "Premium",
        sessions: 10,
        pricePerSession: "R$ 120,00",
        totalPrice: "R$ 1.200,00",
        highlight: true,
        perks: [
          "10 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Drenagem + modelagem combinada",
          "Creme firmador incluso",
          "14% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 15,
        pricePerSession: "R$ 105,00",
        totalPrice: "R$ 1.575,00",
        perks: [
          "15 sessões de 60 minutos",
          "Avaliação corporal completa",
          "Drenagem + modelagem + redutora",
          "Creme firmador + esfoliante",
          "Acompanhamento nutricional",
          "25% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 1,
        pricePerSession: "R$ 120,00",
        totalPrice: "R$ 120,00",
        perks: [
          "1 sessão completa",
          "Higienização + extração",
          "Máscara calmante",
        ],
      },
      {
        name: "Premium",
        sessions: 6,
        pricePerSession: "R$ 100,00",
        totalPrice: "R$ 600,00",
        highlight: true,
        perks: [
          "6 sessões (semestral)",
          "Higienização + extração profunda",
          "Máscara revitalizante",
          "Peeling enzimático incluso",
          "17% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 12,
        pricePerSession: "R$ 85,00",
        totalPrice: "R$ 1.020,00",
        perks: [
          "12 sessões (anual)",
          "Higienização + extração profunda",
          "Peeling + máscara premium",
          "Sérum vitamina C incluso",
          "Kit skincare de brinde",
          "29% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 3,
        pricePerSession: "R$ 350,00",
        totalPrice: "R$ 1.050,00",
        perks: [
          "3 sessões de 50 minutos",
          "Avaliação de pele inicial",
          "Drug delivery básico",
        ],
      },
      {
        name: "Premium",
        sessions: 4,
        pricePerSession: "R$ 300,00",
        totalPrice: "R$ 1.200,00",
        highlight: true,
        perks: [
          "4 sessões de 60 minutos",
          "Avaliação de pele completa",
          "Drug delivery com vitamina C",
          "Máscara LED inclusa",
          "14% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 6,
        pricePerSession: "R$ 270,00",
        totalPrice: "R$ 1.620,00",
        perks: [
          "6 sessões de 60 minutos",
          "Avaliação de pele completa",
          "Drug delivery premium",
          "LED + máscara biocelular",
          "Kit skincare pós-procedimento",
          "23% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 4,
        pricePerSession: "R$ 250,00",
        totalPrice: "R$ 1.000,00",
        perks: [
          "4 sessões de 40 minutos",
          "Avaliação facial/corporal",
          "Protocolo padrão",
        ],
      },
      {
        name: "Premium",
        sessions: 8,
        pricePerSession: "R$ 215,00",
        totalPrice: "R$ 1.720,00",
        highlight: true,
        perks: [
          "8 sessões de 50 minutos",
          "Avaliação completa",
          "Radiofrequência + máscara tensor",
          "Sérum firmador incluso",
          "14% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 12,
        pricePerSession: "R$ 190,00",
        totalPrice: "R$ 2.280,00",
        perks: [
          "12 sessões de 50 minutos",
          "Avaliação completa",
          "RF + máscara tensor + LED",
          "Kit anti-aging completo",
          "Acompanhamento personalizado",
          "24% de desconto por sessão",
        ],
      },
    ],
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
    image: drenagemImg,
    packages: [
      {
        name: "Essencial",
        sessions: 5,
        pricePerSession: "R$ 200,00",
        totalPrice: "R$ 1.000,00",
        perks: [
          "5 sessões de 60 minutos",
          "Drenagem linfática pós-cirúrgica",
          "Avaliação inicial",
        ],
      },
      {
        name: "Premium",
        sessions: 10,
        pricePerSession: "R$ 175,00",
        totalPrice: "R$ 1.750,00",
        highlight: true,
        perks: [
          "10 sessões de 75 minutos",
          "Drenagem + ultrassom terapêutico",
          "Avaliação completa",
          "Endermoterapia inclusa",
          "13% de desconto por sessão",
        ],
      },
      {
        name: "VIP",
        sessions: 20,
        pricePerSession: "R$ 150,00",
        totalPrice: "R$ 3.000,00",
        perks: [
          "20 sessões de 90 minutos",
          "Protocolo completo pós-cirúrgico",
          "Drenagem + ultrassom + endermo",
          "Cinta modeladora de brinde",
          "Acompanhamento semanal",
          "25% de desconto por sessão",
        ],
      },
    ],
  },
];

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return services.find((s) => s.slug === slug);
}
