-- Set the SEO OG image to the newly generated professional asset
UPDATE public.site_settings
SET value = 'https://rosa-lis-glow.lovable.app/images/og-rosa-de-lis.png',
    updated_at = now()
WHERE key = 'seo_og_image';

INSERT INTO public.site_settings (key, value)
SELECT 'seo_og_image', 'https://rosa-lis-glow.lovable.app/images/og-rosa-de-lis.png'
WHERE NOT EXISTS (
  SELECT 1 FROM public.site_settings WHERE key = 'seo_og_image'
);