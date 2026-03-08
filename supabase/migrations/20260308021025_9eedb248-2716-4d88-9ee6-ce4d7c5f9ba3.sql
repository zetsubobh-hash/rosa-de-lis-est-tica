UPDATE public.site_settings
SET value = '/images/og-rosa-de-lis.png',
    updated_at = now()
WHERE key = 'seo_og_image';