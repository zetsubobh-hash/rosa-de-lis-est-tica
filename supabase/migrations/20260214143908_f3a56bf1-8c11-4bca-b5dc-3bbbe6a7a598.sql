INSERT INTO public.site_settings (key, value) VALUES 
('seo_meta_title', 'Rosa de Lis Estética — Tratamentos Faciais e Corporais'),
('seo_meta_description', 'Clínica de estética especializada em tratamentos faciais, corporais e bem-estar. Agende sua avaliação!')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();