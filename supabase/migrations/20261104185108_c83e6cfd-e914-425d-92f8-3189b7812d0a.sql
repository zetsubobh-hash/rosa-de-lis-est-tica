INSERT INTO public.service_gallery (service_slug, before_url, after_url, caption, sort_order)
SELECT s.slug, '/gallery/' || COALESCE(m.cat0,'body') || '-antes.webp', '/gallery/' || COALESCE(m.cat0,'body') || '-depois.webp', 'Resultado ilustrativo — ' || trim(s.title), 0
FROM public.services s
LEFT JOIN (VALUES
 ('botox','face-wrinkles'),('radiofrequencia','face-wrinkles'),('ultrafocus-hi-fu-facial','face-wrinkles'),('revitalizacao-facial','face-wrinkles'),
 ('peeling-de-diamante','face-skin'),('peeling-de-cristal','face-skin'),('limpeza-de-pele','face-skin'),('microagulhamento','face-skin'),('peeling-quimico','face-skin'),('hidra-gloss','face-skin'),('bronzeamento-natural','face-skin'),
 ('designer-de-sobrancelhas','brows'),('micropigmentacao','brows'),
 ('mezoterapia-capilar','scalp'),
 ('epilacao-laser','hair-removal'),('depilacao-cera','hair-removal')
) AS m(slug, cat0) ON m.slug = s.slug
WHERE s.slug IS NOT NULL;
UPDATE public.services SET gallery_enabled = true;