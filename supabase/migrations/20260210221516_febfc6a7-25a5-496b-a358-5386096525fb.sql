
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Make username required going forward
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- Make email column track the optional real email
ALTER TABLE public.profiles ADD COLUMN email text;
