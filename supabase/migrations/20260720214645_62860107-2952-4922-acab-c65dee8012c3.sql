ALTER TABLE public.profiles ALTER COLUMN sex DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;