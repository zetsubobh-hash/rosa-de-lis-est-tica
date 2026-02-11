-- Create services table to store all service data dynamically
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  icon_name text NOT NULL DEFAULT 'Sparkles',
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  benefits text[] NOT NULL DEFAULT '{}',
  duration text NOT NULL DEFAULT '',
  price_label text NOT NULL DEFAULT '',
  sessions_label text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can read active services
CREATE POLICY "Anyone can read active services"
ON public.services FOR SELECT
USING (is_active = true);

-- Admins can read all services (including inactive)
CREATE POLICY "Admins can read all services"
ON public.services FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage services
CREATE POLICY "Admins can insert services"
ON public.services FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update services"
ON public.services FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete services"
ON public.services FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with existing services data
INSERT INTO public.services (slug, title, icon_name, short_description, full_description, benefits, duration, price_label, sessions_label, sort_order) VALUES
('drenagem-linfatica', 'Drenagem Linfática', 'Droplets', 'Técnica manual que estimula o sistema linfático, reduzindo inchaço, retenção de líquidos e toxinas. Ideal para pós-operatório, gestantes e bem-estar geral.', 'A Drenagem Linfática é uma técnica de massagem suave e ritmada que atua diretamente no sistema linfático, promovendo a eliminação de toxinas, redução de edemas e melhora da circulação. É um dos tratamentos mais procurados para pós-operatório, gestantes e quem busca bem-estar e leveza no dia a dia. Nossos profissionais utilizam protocolos personalizados para cada paciente, garantindo resultados visíveis desde a primeira sessão.', ARRAY['Redução de inchaço e retenção de líquidos','Eliminação de toxinas do organismo','Melhora da circulação sanguínea e linfática','Alívio de dores e sensação de peso nas pernas','Auxílio na recuperação pós-operatória','Relaxamento profundo e bem-estar'], '60 minutos', 'A partir de R$ 150,00', 'Recomendamos pacotes de 10 sessões', 1),
('criolipólise', 'Criolipólise', 'Snowflake', 'Procedimento não invasivo que congela e elimina células de gordura localizada. Resultados visíveis e duradouros sem necessidade de cirurgia.', 'A Criolipólise é um procedimento revolucionário que utiliza resfriamento controlado para destruir células de gordura localizada de forma definitiva. O tratamento é seguro, não invasivo e não requer tempo de recuperação. É ideal para pessoas que desejam eliminar gordurinhas resistentes ao exercício físico e dieta, como abdômen, flancos, costas e coxas.', ARRAY['Eliminação definitiva de células de gordura','Procedimento indolor e não invasivo','Sem tempo de recuperação','Resultados visíveis em 30 a 60 dias','Modelagem do contorno corporal','Seguro e aprovado pela ANVISA'], '40 a 60 minutos por área', 'A partir de R$ 500,00', '1 a 3 sessões por área', 2),
('botox', 'Botox', 'Syringe', 'Aplicação de toxina botulínica para suavizar rugas e linhas de expressão, proporcionando um aspecto rejuvenescido e natural ao rosto.', 'O Botox é o tratamento estético mais realizado no mundo para suavização de rugas e linhas de expressão. Utilizamos toxina botulínica de alta qualidade, aplicada com precisão para garantir um resultado natural e harmonioso. O procedimento é rápido, seguro e os efeitos são visíveis em poucos dias, proporcionando uma aparência rejuvenescida e descansada.', ARRAY['Suavização de rugas e linhas de expressão','Prevenção do envelhecimento precoce','Resultado natural e harmonioso','Procedimento rápido (15-30 minutos)','Sem tempo de recuperação','Efeito duradouro de 4 a 6 meses'], '15 a 30 minutos', 'A partir de R$ 800,00', 'Manutenção a cada 4-6 meses', 3),
('carboxiterapia', 'Carboxiterapia', 'Wind', 'Infusão de gás carbônico sob a pele para melhorar a circulação, tratar celulite, estrias e gordura localizada com resultados comprovados.', 'A Carboxiterapia consiste na infusão controlada de gás carbônico (CO₂) sob a pele, promovendo vasodilatação e aumento da oxigenação tecidual. É um tratamento versátil, indicado para celulite, estrias, gordura localizada, olheiras e flacidez. Os resultados são progressivos e comprovados cientificamente.', ARRAY['Melhora significativa da celulite','Tratamento eficaz de estrias','Redução de gordura localizada','Melhora da oxigenação dos tecidos','Estímulo à produção de colágeno','Resultados comprovados cientificamente'], '20 a 40 minutos', 'A partir de R$ 200,00', 'Pacote de 10 a 20 sessões', 4),
('peeling-de-diamante', 'Peeling de Diamante', 'Gem', 'Esfoliação mecânica com ponteiras diamantadas que remove células mortas, estimula a renovação celular e deixa a pele luminosa e uniforme.', 'O Peeling de Diamante é um procedimento de microdermoabrasão que utiliza ponteiras com microcristais de diamante para esfoliar a camada superficial da pele. O tratamento remove células mortas, estimula a renovação celular e melhora a textura e luminosidade da pele. É indicado para todos os tipos de pele e pode ser realizado em qualquer época do ano.', ARRAY['Renovação celular acelerada','Pele mais luminosa e uniforme','Redução de manchas superficiais','Melhora da textura da pele','Desobstrução dos poros','Potencializa absorção de ativos'], '30 a 45 minutos', 'A partir de R$ 180,00', 'Pacote de 4 a 6 sessões', 5),
('peeling-de-cristal', 'Peeling de Cristal', 'CircleDot', 'Microdermoabrasão com microcristais de óxido de alumínio para tratar manchas, cicatrizes de acne e melhorar a textura da pele.', 'O Peeling de Cristal utiliza jatos de microcristais de óxido de alumínio para promover uma esfoliação profunda e controlada da pele. É especialmente indicado para tratamento de manchas, cicatrizes de acne, rugas finas e para melhorar a textura geral da pele. O procedimento é seguro e oferece resultados visíveis já na primeira sessão.', ARRAY['Tratamento de manchas e cicatrizes','Redução de rugas finas','Melhora da textura da pele','Estímulo à produção de colágeno','Resultados desde a primeira sessão','Indicado para diversos tipos de pele'], '30 a 45 minutos', 'A partir de R$ 180,00', 'Pacote de 4 a 6 sessões', 6),
('massagem-redutora', 'Massagem Redutora', 'HandMetal', 'Técnica de movimentos firmes e rápidos que quebra moléculas de gordura, reduz medidas e modela o contorno corporal de forma natural.', 'A Massagem Redutora utiliza movimentos firmes, rápidos e profundos para ativar a circulação, quebrar moléculas de gordura e promover a redução de medidas. É um tratamento eficaz para modelar o contorno corporal, combater celulite e melhorar a firmeza da pele. Resultados potencializados quando combinado com alimentação equilibrada e exercícios.', ARRAY['Redução de medidas corporais','Modelagem do contorno corporal','Melhora da circulação local','Combate à celulite','Melhora da firmeza da pele','Sensação de leveza e bem-estar'], '50 a 60 minutos', 'A partir de R$ 130,00', 'Pacote de 10 a 15 sessões', 7),
('massagem-modeladora', 'Massagem Modeladora', 'Waves', 'Combina manobras de drenagem e modelagem para esculpir o corpo, definir curvas e melhorar a firmeza da pele.', 'A Massagem Modeladora combina técnicas de drenagem linfática e movimentos de modelagem para esculpir o corpo, definir curvas e melhorar a firmeza da pele. É indicada para quem deseja um contorno corporal mais definido e uma pele mais firme e tonificada. Nossos profissionais personalizam o protocolo conforme as necessidades de cada paciente.', ARRAY['Esculpir e definir curvas corporais','Melhora da firmeza e tônus da pele','Redução de celulite e irregularidades','Ativação da circulação sanguínea','Eliminação de toxinas','Protocolo personalizado por paciente'], '50 a 60 minutos', 'A partir de R$ 140,00', 'Pacote de 10 sessões', 8),
('bronzeamento-natural', 'Bronzeamento Natural', 'Sun', 'Técnica de bronzeamento com produtos naturais que proporcionam um tom dourado uniforme e duradouro, sem exposição aos raios UV.', 'O Bronzeamento Natural é realizado com produtos de alta qualidade à base de DHA, que reage com a camada superficial da pele para produzir um tom bronzeado natural e uniforme. O procedimento é seguro, não utiliza raios UV e o resultado dura de 5 a 10 dias. Ideal para quem deseja uma pele bronzeada sem os riscos da exposição solar.', ARRAY['Bronzeado natural e uniforme','Sem exposição a raios UV','Resultado imediato','Duração de 5 a 10 dias','Produtos hipoalergênicos','Personalização do tom desejado'], '30 a 45 minutos', 'A partir de R$ 120,00', 'Sessão única ou pacotes', 9),
('limpeza-de-pele', 'Limpeza de Pele', 'Sparkles', 'Procedimento completo de higienização profunda que remove cravos, células mortas e impurezas, devolvendo vitalidade e frescor à pele.', 'A Limpeza de Pele é um procedimento estético essencial que realiza a higienização profunda da pele, removendo cravos, células mortas, impurezas e excesso de oleosidade. O tratamento inclui esfoliação, extração, aplicação de máscara e hidratação, deixando a pele renovada, saudável e preparada para receber outros tratamentos. Recomendada mensalmente para manter a saúde da pele.', ARRAY['Remoção profunda de cravos e impurezas','Desobstrução e redução dos poros','Renovação celular','Pele mais luminosa e saudável','Preparação para outros tratamentos','Prevenção de acne e oleosidade'], '60 a 90 minutos', 'A partir de R$ 150,00', 'Recomendada mensalmente', 10),
('microagulhamento', 'Microagulhamento', 'Zap', 'Técnica que utiliza microagulhas para estimular a produção natural de colágeno, tratando cicatrizes, rugas e melhorando a textura da pele.', 'O Microagulhamento é um procedimento minimamente invasivo que utiliza um dispositivo com microagulhas para criar microcanais na pele, estimulando a produção natural de colágeno e elastina. É altamente eficaz para tratamento de cicatrizes de acne, rugas finas, manchas, estrias e para rejuvenescimento geral da pele. O procedimento potencializa a absorção de ativos, maximizando os resultados.', ARRAY['Estímulo natural de colágeno e elastina','Tratamento de cicatrizes e manchas','Redução de rugas e linhas finas','Melhora da textura e firmeza da pele','Potencializa absorção de dermocosméticos','Resultados progressivos e duradouros'], '40 a 60 minutos', 'A partir de R$ 350,00', 'Pacote de 3 a 6 sessões', 11),
('radiofrequência', 'Radiofrequência', 'ShieldCheck', 'Tecnologia que aquece as camadas profundas da pele para estimular colágeno, combater flacidez e promover o rejuvenescimento facial e corporal.', 'A Radiofrequência é uma tecnologia avançada que utiliza ondas eletromagnéticas para aquecer as camadas profundas da pele, estimulando a produção de novo colágeno e elastina. O tratamento é indicado para combater a flacidez facial e corporal, melhorar o contorno do rosto e do corpo, e promover o rejuvenescimento da pele. Os resultados são progressivos e acumulativos, com melhora visível a cada sessão.', ARRAY['Combate eficaz à flacidez','Estímulo à produção de colágeno','Rejuvenescimento facial e corporal','Melhora do contorno facial','Resultados progressivos e acumulativos','Procedimento confortável e seguro'], '30 a 50 minutos', 'A partir de R$ 250,00', 'Pacote de 6 a 10 sessões', 12);

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for service images
CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));