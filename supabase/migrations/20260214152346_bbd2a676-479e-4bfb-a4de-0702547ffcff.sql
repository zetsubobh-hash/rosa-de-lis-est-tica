INSERT INTO public.payment_settings (key, value) VALUES 
('whatsapp_msg_reschedule_enabled', 'true'),
('whatsapp_msg_reschedule_text', 'Olá {nome}! 🔄 Seu agendamento de *{servico}* foi reagendado para o dia *{data}* às *{hora}*. Nos vemos em breve! 💕'),
('whatsapp_msg_admin_enabled', 'true'),
('whatsapp_msg_admin_text', '🔔 Novo agendamento! Cliente: *{nome}* | Serviço: *{servico}* | Data: *{data}* às *{hora}*.')
ON CONFLICT (key) DO NOTHING;