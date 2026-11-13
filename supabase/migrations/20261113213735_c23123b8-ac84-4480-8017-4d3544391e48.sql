CREATE TABLE public.evolution_chat_archive (
 instance text NOT NULL,
 jid text NOT NULL,
 name text NOT NULL,
 phone text,
 unread integer NOT NULL DEFAULT 0,
 last_message jsonb,
 last_timestamp bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (instance, jid)
);
GRANT SELECT ON public.evolution_chat_archive TO authenticated;
GRANT ALL ON public.evolution_chat_archive TO service_role;
ALTER TABLE public.evolution_chat_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Walliston reads private chat archive" ON public.evolution_chat_archive FOR SELECT TO authenticated USING (auth.uid() = '4649913b-f48b-470e-b407-251803756157'::uuid AND public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER evolution_chat_archive_updated BEFORE UPDATE ON public.evolution_chat_archive FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.evolution_message_archive (
 instance text NOT NULL,
 jid text NOT NULL,
 message_id text NOT NULL,
 content jsonb NOT NULL,
 message_timestamp bigint NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (instance, jid, message_id)
);
GRANT SELECT ON public.evolution_message_archive TO authenticated;
GRANT ALL ON public.evolution_message_archive TO service_role;
ALTER TABLE public.evolution_message_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Walliston reads private message archive" ON public.evolution_message_archive FOR SELECT TO authenticated USING (auth.uid() = '4649913b-f48b-470e-b407-251803756157'::uuid AND public.has_role(auth.uid(), 'admin'));
CREATE INDEX evolution_message_archive_conversation ON public.evolution_message_archive(instance, jid, message_timestamp DESC, message_id);
CREATE INDEX evolution_chat_archive_recent ON public.evolution_chat_archive(instance, last_timestamp DESC, jid);
CREATE TRIGGER evolution_message_archive_updated BEFORE UPDATE ON public.evolution_message_archive FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();