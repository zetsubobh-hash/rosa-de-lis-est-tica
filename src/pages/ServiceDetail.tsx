import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CreditCard, CalendarCheck, CalendarPlus, ArrowRight, ChevronRight, Check, Star } from "lucide-react";
import { getServiceBySlug, services } from "@/data/services";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const service = slug ? getServiceBySlug(slug) : undefined;

  const handleAgendar = () => {
    if (!user) {
      setAuthModalOpen(true);
    } else {
      navigate(`/agendar/${slug}`);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Get related services (exclude current, pick 3)
  const related = services.filter((s) => s.slug !== slug).slice(0, 3);

  if (!service) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center px-6 pt-20">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold text-foreground mb-4">
              Serviço não encontrado
            </h1>
            <Link to="/" className="text-primary hover:underline font-body">
              ← Voltar ao início
            </Link>
          </div>
        </div>
      </>
    );
  }

  const Icon = service.icon;

  // TODO: Link to scheduling system when ready

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero banner */}
      <section className="relative pt-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(var(--pink-dark))]" />

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary-foreground"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-primary-foreground"
        />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-8 font-body text-sm text-primary-foreground/60"
          >
            <Link to="/" className="hover:text-primary-foreground transition-colors">
              Início
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/#servicos" className="hover:text-primary-foreground transition-colors">
              Serviços
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary-foreground">{service.title}</span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-3xl bg-primary-foreground/15 backdrop-blur-sm border border-primary-foreground/10"
            >
              <Icon className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" strokeWidth={1.5} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <p className="font-body text-primary-foreground/60 text-xs tracking-[0.3em] uppercase font-semibold mb-2">
                Tratamento Estético
              </p>
              <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
                {service.title}
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Straight separator */}
      </section>

      {/* About: image left + description right */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-14">
          {service.image && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex-shrink-0"
            >
              <img
                src={service.image}
                alt={service.title}
                className="max-w-[260px] md:max-w-[320px]"
              />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex-1"
          >
            <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">
              Sobre o tratamento
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-5">
              {service.title}
            </h2>
            <p className="font-body text-muted-foreground text-sm md:text-base leading-[1.9]">
              {service.fullDescription}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits + Sidebar */}
      <section className="max-w-6xl mx-auto px-6 pb-12 md:pb-20">
        <div className="grid lg:grid-cols-5 gap-10 md:gap-16">
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">
                Vantagens
              </p>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-6">
                Benefícios
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {service.benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="group flex items-start gap-3 p-4 rounded-2xl bg-rose-soft hover:bg-primary/10 transition-colors duration-300"
                  >
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <div className="w-2 h-2 rounded-full bg-primary group-hover:bg-primary-foreground transition-colors duration-300" />
                    </div>
                    <p className="font-body text-foreground text-sm leading-relaxed">{benefit}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="lg:sticky lg:top-28 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm"
              >
                <h3 className="font-heading text-lg font-bold text-foreground mb-6">Informações</h3>
                <div className="space-y-5">
                  {[
                    { icon: Clock, label: "Duração", value: service.duration },
                    { icon: CreditCard, label: "Investimento", value: service.price },
                    { icon: CalendarCheck, label: "Sessões", value: service.sessions },
                  ].map(({ icon: InfoIcon, label, value }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-rose-soft"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                        <InfoIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">{label}</p>
                        <p className="font-body text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      {service.packages && service.packages.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">
              Pacotes
            </p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
              Escolha o seu <span className="text-pink-vibrant">Plano</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {service.packages.map((pkg, i) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative rounded-3xl p-6 md:p-8 border cursor-pointer ${
                  pkg.highlight
                    ? "bg-gradient-to-br from-primary to-[hsl(var(--pink-dark))] text-primary-foreground border-transparent shadow-xl"
                    : "bg-card text-foreground border-border shadow-sm"
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-foreground text-primary font-body text-[10px] font-bold uppercase tracking-[0.2em] rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Mais popular
                  </div>
                )}

                <h3 className="font-heading text-lg md:text-xl font-bold mb-1">
                  {pkg.name}
                </h3>
                <p className={`font-body text-xs mb-4 ${pkg.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {pkg.sessions} sessões
                </p>

                <div className="mb-1">
                  <span className="font-heading text-3xl md:text-4xl font-bold">
                    {pkg.pricePerSession}
                  </span>
                  <span className={`font-body text-sm ml-1 ${pkg.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    /sessão
                  </span>
                </div>
                <p className={`font-body text-xs mb-6 ${pkg.highlight ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                  Total: {pkg.totalPrice}
                </p>

                <ul className="space-y-3 mb-8">
                  {pkg.perks.map((perk, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        pkg.highlight ? "bg-primary-foreground/20" : "bg-primary/10"
                      }`}>
                        <Check className={`w-3 h-3 ${pkg.highlight ? "text-primary-foreground" : "text-primary"}`} />
                      </div>
                      <span className={`font-body text-sm leading-relaxed ${pkg.highlight ? "text-primary-foreground/90" : "text-foreground"}`}>
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleAgendar}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 font-body text-sm font-bold rounded-2xl transition-all duration-300 uppercase tracking-wider ${
                    pkg.highlight
                      ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  <CalendarPlus className="w-4 h-4" />
                  Agendar Agora
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Agende */}
      <section className="max-w-3xl mx-auto px-6 pb-16 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-primary to-[hsl(var(--pink-dark))] rounded-3xl p-8 md:p-10 text-primary-foreground text-center"
        >
          <h3 className="font-heading text-xl md:text-2xl font-bold mb-3">Agende seu horário</h3>
          <p className="font-body text-primary-foreground/70 text-sm md:text-base mb-8 leading-relaxed max-w-lg mx-auto">
            Escolha o melhor dia e horário para o seu tratamento diretamente pelo nosso sistema de agendamento.
          </p>
          <button
            onClick={handleAgendar}
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary-foreground text-primary font-body text-sm font-bold rounded-2xl hover:bg-primary-foreground/90 transition-all duration-300 uppercase tracking-wider"
          >
            <CalendarPlus className="w-5 h-5" />
            Agendar Agora
          </button>
          <p className="font-body text-[11px] text-primary-foreground/50 mt-5 leading-relaxed">
            Valores podem variar conforme avaliação personalizada.
          </p>
        </motion.div>
      </section>

      <section className="bg-rose-soft py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">
              Conheça também
            </p>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
              Outros <span className="text-pink-vibrant">Tratamentos</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((s, i) => (
              <Link key={s.slug} to={`/servico/${s.slug}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group bg-background rounded-2xl p-6 border border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-500 cursor-pointer h-full"
                >
                  <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary transition-all duration-500">
                    <s.icon
                      className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors duration-500"
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-3">
                    {s.shortDescription}
                  </p>
                  <div className="flex items-center gap-1 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Ver detalhes <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
};

export default ServiceDetail;
