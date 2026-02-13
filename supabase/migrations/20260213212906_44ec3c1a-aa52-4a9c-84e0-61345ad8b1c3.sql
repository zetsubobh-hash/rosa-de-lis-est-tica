
-- Assign Camila (partner_id: 14d428f7-d6c4-410b-b895-95b13b1d331f) to the 3 future appointments
-- for user cadbcb13 (Alisson Luiz / teste) that currently have no partner assigned
UPDATE public.appointments 
SET partner_id = '14d428f7-d6c4-410b-b895-95b13b1d331f'
WHERE id IN (
  '6008dfb2-f9a6-4175-abfc-ec74e21c2ba7',
  'ac7f3b58-15a5-4d66-8c83-00c693e0cd9a',
  '9eea790d-864a-4ee0-b394-55fe3970e6fb'
) AND partner_id IS NULL;
