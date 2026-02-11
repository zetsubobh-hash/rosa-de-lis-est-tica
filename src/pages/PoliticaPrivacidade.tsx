import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock, Eye, Trash2, UserCheck, Cookie, Server, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";

const sections = [
  {
    icon: Eye,
    title: "1. Coleta de Dados Pessoais",
    content: `Coletamos os seguintes dados pessoais quando você utiliza nossos serviços:

• **Nome completo** — para identificação e personalização do atendimento.
• **Telefone** — para comunicação sobre agendamentos e confirmações.
• **Endereço** — para eventual necessidade de contato presencial.
• **Gênero** — para personalização da experiência no sistema.
• **Foto de perfil** — opcional, para identificação visual na plataforma.

Esses dados são coletados diretamente de você no momento do cadastro e são essenciais para a prestação dos nossos serviços de estética.`,
  },
  {
    icon: UserCheck,
    title: "2. Finalidade do Tratamento",
    content: `Utilizamos seus dados pessoais para as seguintes finalidades:

• **Agendamento de serviços** — gerenciar e confirmar seus horários.
• **Comunicação** — enviar lembretes, confirmações e notificações via WhatsApp.
• **Personalização** — oferecer uma experiência adaptada ao seu perfil.
• **Melhoria do serviço** — análises internas para aprimorar nosso atendimento.
• **Obrigações legais** — cumprir exigências fiscais e regulatórias.

Não utilizamos seus dados para fins de marketing sem seu consentimento expresso.`,
  },
  {
    icon: Lock,
    title: "3. Segurança dos Dados",
    content: `Adotamos medidas de segurança técnicas e administrativas para proteger seus dados pessoais:

• **Criptografia** — dados transmitidos são protegidos por protocolo SSL/TLS.
• **Controle de acesso** — apenas profissionais autorizados acessam seus dados.
• **Armazenamento seguro** — utilizamos infraestrutura de nuvem com padrões internacionais de segurança.
• **Senhas protegidas** — armazenadas de forma criptografada, nunca em texto simples.

Em caso de incidente de segurança que possa afetar seus dados, notificaremos você e a Autoridade Nacional de Proteção de Dados (ANPD) conforme determina a LGPD.`,
  },
  {
    icon: Cookie,
    title: "4. Uso de Cookies",
    content: `Nosso site utiliza cookies para melhorar sua experiência de navegação:

• **Cookies essenciais** — necessários para o funcionamento do site (autenticação, sessão).
• **Cookies de preferência** — armazenam suas escolhas (como aceitação desta política).
• **Cookies analíticos** — nos ajudam a entender como você usa o site para melhorias.

Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento de algumas funcionalidades do site. Ao clicar em "Aceitar" no banner de cookies, você concorda com o uso conforme descrito acima.`,
  },
  {
    icon: ShieldCheck,
    title: "5. Seus Direitos (LGPD)",
    content: `De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:

• **Confirmação** — saber se tratamos seus dados pessoais.
• **Acesso** — obter cópia dos dados que possuímos sobre você.
• **Correção** — solicitar a atualização de dados incompletos ou incorretos.
• **Anonimização** — solicitar a anonimização de dados desnecessários.
• **Portabilidade** — transferir seus dados a outro prestador de serviço.
• **Eliminação** — solicitar a exclusão dos seus dados pessoais.
• **Revogação** — revogar o consentimento dado anteriormente.

Para exercer qualquer destes direitos, entre em contato conosco pelos canais indicados abaixo.`,
  },
  {
    icon: Server,
    title: "6. Compartilhamento de Dados",
    content: `Seus dados pessoais podem ser compartilhados com:

• **Profissionais parceiros** — esteticistas que realizarão seu atendimento, recebendo apenas as informações necessárias (nome, horário, serviço agendado).
• **Provedores de tecnologia** — serviços de hospedagem e infraestrutura que seguem padrões rigorosos de segurança.

**Não vendemos, alugamos ou comercializamos** seus dados pessoais com terceiros para fins de marketing ou publicidade.`,
  },
  {
    icon: Trash2,
    title: "7. Retenção e Exclusão",
    content: `Mantemos seus dados pessoais pelo tempo necessário para:

• Prestar os serviços contratados.
• Cumprir obrigações legais e regulatórias.
• Exercer direitos em processos judiciais ou administrativos.

Após o término da finalidade ou mediante sua solicitação, seus dados serão eliminados de forma segura, salvo obrigação legal de retenção.`,
  },
  {
    icon: Mail,
    title: "8. Contato e Encarregado (DPO)",
    content: `Para dúvidas, solicitações ou exercício dos seus direitos relacionados à proteção de dados, entre em contato:

• **WhatsApp:** (11) 99999-9999
• **E-mail:** privacidade@rosadelis.com.br

Nosso Encarregado de Proteção de Dados (DPO) está disponível para atender suas solicitações no prazo de até 15 dias úteis, conforme estabelecido pela LGPD.

**Última atualização:** Fevereiro de 2026.`,
  },
];

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />
        <div className="relative max-w-4xl mx-auto px-6 py-12 md:py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-1">LGPD</p>
              <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground">Política de Privacidade</h1>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-body text-sm text-muted-foreground leading-relaxed"
        >
          A <strong className="text-foreground">Rosa de Lis Estética</strong> valoriza a privacidade e a proteção dos dados pessoais de seus clientes. 
          Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos e protegemos suas informações, 
          em conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
        </motion.p>

        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <section.icon className="w-4 h-4 text-primary" />
              </div>
              <h2 className="font-heading text-base font-bold text-foreground">{section.title}</h2>
            </div>
            <div className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={j} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </div>
          </motion.div>
        ))}

        <div className="text-center pt-4 pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default PoliticaPrivacidade;
