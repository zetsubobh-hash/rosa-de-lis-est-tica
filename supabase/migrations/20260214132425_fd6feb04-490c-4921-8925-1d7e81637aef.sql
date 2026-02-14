
-- Create anamnesis table to store client assessment forms
CREATE TABLE public.anamnesis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID REFERENCES public.partners(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Queixa Principal
  motivo_consulta TEXT DEFAULT '',
  area_tratada TEXT DEFAULT '',
  tempo_queixa TEXT DEFAULT '',
  tratamentos_anteriores TEXT DEFAULT '',
  
  -- Histórico de Saúde
  doencas TEXT[] DEFAULT '{}',
  doencas_outras TEXT DEFAULT '',
  cirurgias TEXT DEFAULT '',
  alergias TEXT[] DEFAULT '{}',
  alergias_outras TEXT DEFAULT '',
  medicamentos TEXT DEFAULT '',
  disturbios_hormonais BOOLEAN DEFAULT false,
  disturbios_hormonais_detalhe TEXT DEFAULT '',
  problemas_pele TEXT[] DEFAULT '{}',
  problemas_pele_outros TEXT DEFAULT '',
  gestante_amamentando TEXT DEFAULT 'nao',
  
  -- Hábitos de Vida
  consumo_agua TEXT DEFAULT '',
  alimentacao TEXT DEFAULT '',
  atividade_fisica TEXT DEFAULT '',
  tabagismo TEXT DEFAULT 'nao',
  consumo_alcool TEXT DEFAULT '',
  qualidade_sono TEXT DEFAULT '',
  nivel_estresse TEXT DEFAULT '',
  
  -- Avaliação Estética
  tipo_pele TEXT DEFAULT '',
  fototipo TEXT DEFAULT '',
  condicoes_esteticas TEXT[] DEFAULT '{}',
  condicoes_esteticas_outras TEXT DEFAULT '',
  grau_sensibilidade TEXT DEFAULT '',
  avaliacao_corporal TEXT DEFAULT '',
  
  -- Termos Legais
  consentimento_informado BOOLEAN DEFAULT false,
  autorizacao_imagem BOOLEAN DEFAULT false,
  assinatura_cliente TEXT DEFAULT '',
  assinatura_profissional TEXT DEFAULT '',
  data_assinatura DATE DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage all anamnesis"
ON public.anamnesis FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Partners can create/view/update anamnesis for their clients
CREATE POLICY "Partners can insert anamnesis"
ON public.anamnesis FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) AND
  EXISTS (
    SELECT 1 FROM partners p WHERE p.id = anamnesis.partner_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can view anamnesis"
ON public.anamnesis FOR SELECT
USING (
  has_role(auth.uid(), 'partner'::app_role) AND
  EXISTS (
    SELECT 1 FROM partners p WHERE p.id = anamnesis.partner_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Partners can update anamnesis"
ON public.anamnesis FOR UPDATE
USING (
  has_role(auth.uid(), 'partner'::app_role) AND
  EXISTS (
    SELECT 1 FROM partners p WHERE p.id = anamnesis.partner_id AND p.user_id = auth.uid()
  )
);

-- Users can view their own anamnesis
CREATE POLICY "Users can view own anamnesis"
ON public.anamnesis FOR SELECT
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_anamnesis_updated_at
BEFORE UPDATE ON public.anamnesis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: one anamnesis per client per partner
CREATE UNIQUE INDEX idx_anamnesis_user_partner ON public.anamnesis(user_id, partner_id);
