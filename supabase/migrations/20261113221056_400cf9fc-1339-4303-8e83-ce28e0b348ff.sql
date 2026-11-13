CREATE OR REPLACE FUNCTION public.fold_search_text(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(lower(coalesce(value, '')), 'á', 'a'), 'à', 'a'), 'â', 'a'), 'ã', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'í', 'i'), 'ì', 'i'), 'î', 'i'), 'ï', 'i'), 'ó', 'o'), 'ò', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o'), 'ú', 'u'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ñ', 'n');
$$;

ALTER TABLE public.evolution_message_archive
  ADD COLUMN IF NOT EXISTS search_text text GENERATED ALWAYS AS (
    public.fold_search_text(
      coalesce(content ->> 'text', '') || ' ' ||
      CASE coalesce(content ->> 'kind', '')
        WHEN 'audio' THEN 'audio voz'
        WHEN 'image' THEN 'imagem foto'
        WHEN 'video' THEN 'video'
        WHEN 'sticker' THEN 'figurinha'
        WHEN 'document' THEN 'documento arquivo pdf'
        ELSE ''
      END
    )
  ) STORED;