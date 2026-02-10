import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CreditCard, CalendarCheck, MessageCircle } from "lucide-react";
import { getServiceBySlug } from "@/data/services";
import { Button } from "@/components/ui/button";

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const service = slug ? getServiceBySlug(slug) : undefined;

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
            Serviço não encontrado
          </h1>
          <Link to="/#servicos" className="text-primary hover:underline font-body">
            ← Voltar aos serviços
          </Link>
        </div>
      </div>
    );
  }

  const Icon = service.icon;

  const whatsappMessage = encodeURIComponent(
    `Olá! Gostaria de agendar o tratamento de ${service.title}. Poderia me informar os horários disponíveis?`
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="text-border">|</span>
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
            Início
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 md:mb-16"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="w-7 h-7 md:w-8 md:h-8 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold">
                Tratamento
              </p>
              <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-foreground">
                {service.title}
              </h1>
            </div>
          </div>

          <p className="font-body text-muted-foreground text-base md:text-lg leading-relaxed max-w-3xl">
            {service.fullDescription}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:col-span-2"
          >
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-6">
              Benefícios
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {service.benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-rose-soft"
                >
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                  <p className="font-body text-foreground text-sm leading-relaxed">{benefit}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sidebar: Info + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Info card */}
            <div className="bg-card rounded-2xl p-6 border border-border space-y-5">
              <h3 className="font-heading text-lg font-bold text-foreground">Informações</h3>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Duração</p>
                  <p className="font-body text-sm font-semibold text-foreground">{service.duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Investimento</p>
                  <p className="font-body text-sm font-semibold text-foreground">{service.price}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Sessões</p>
                  <p className="font-body text-sm font-semibold text-foreground">{service.sessions}</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <a
              href={`https://wa.me/5511999999999?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full h-14 rounded-xl text-base font-semibold gap-2 bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white">
                <MessageCircle className="w-5 h-5" />
                Agendar pelo WhatsApp
              </Button>
            </a>

            <p className="font-body text-xs text-muted-foreground text-center leading-relaxed">
              Valores podem variar conforme avaliação. Entre em contato para um orçamento personalizado.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default ServiceDetail;
