INSERT INTO public.profiles (
  user_id,
  full_name,
  username,
  email,
  sex,
  phone,
  address,
  birth_date
)
SELECT
  '371dcd2f-e210-42c3-8b94-fcf7bc732a14'::uuid,
  'KEVEN COSTA VIEIRA',
  'keven.costa.vieira.860',
  'teste@gmail.com',
  'masculino',
  '31991076485',
  'R. Antonio Teixeira Dias, 2045',
  '1972-04-28'::date
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE user_id = '371dcd2f-e210-42c3-8b94-fcf7bc732a14'::uuid
);