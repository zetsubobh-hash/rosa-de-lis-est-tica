
-- Templates e toggles para mensagens WhatsApp
INSERT INTO public.payment_settings (key, value) VALUES
  ('whatsapp_msg_confirmation_enabled', 'true'),
  ('whatsapp_msg_confirmation_text', 'Olá {nome}! ✅ Seu agendamento de *{servico}* foi confirmado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕'),
  ('whatsapp_msg_reminder_enabled', 'true'),
  ('whatsapp_msg_reminder_text', 'Olá {nome}! 🔔 Lembrete: você tem um agendamento de *{servico}* amanhã, dia *{data}* às *{hora}*. Te esperamos! 💖'),
  ('whatsapp_msg_cancellation_enabled', 'true'),
  ('whatsapp_msg_cancellation_text', 'Olá {nome}, seu agendamento de *{servico}* do dia *{data}* às *{hora}* foi cancelado. Caso queira reagendar, entre em contato conosco. 🌸'),
  ('whatsapp_msg_partner_enabled', 'true'),
  ('whatsapp_msg_partner_text', '🔔 Novo agendamento! Cliente: *{nome}* | Serviço: *{servico}* | Data: *{data}* às *{hora}*.')
ON CONFLICT (key) DO NOTHING;
