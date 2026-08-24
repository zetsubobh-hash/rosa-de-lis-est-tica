{/* aba cliente no admim não foi adicionado filtros e não foi adicionado a chave que eu pedi */}
{/* colocar para opção de importar no admim clientes de arquivo vcf exportados do whatsapp */}
{/* na aba importar cliente ainda não consegui importar arquivos com e extensão vcf. adicione esta opção */}
{/* meu arquivo tem mais te 3000 cliente foram importados somente 1000 olha se tem alguma limitação e corrija */}
{/* aba cliente ainda continua a mostrar somente 1000 clientes, tem que ser visualizado todos */}
{/* aba cliente continua a visualisar somente 1000 clientes arrume */}
{/* permitir excluir cliente selecionado na aba clientes */}
{/* continua aparecer texto falando que foram encontrados 1000 clientes na aba clientes arrume isso de uma vez */}
{/* minha base de dados é de 4305 existe um texto na aba cliente falando que foi encontrado 1000 clientes somente arrume este texto para mostrar corretamente */}
{/* visualização dos clientes esta se limitando a 1000 na aba clientes arrume isso de vez */}
{/* no modo de visualização por lista numerar os clientes exibindo numero crescente */}
{/* continua com erro na aba de clientes visualizando somente 1000 esta mostrando para mim ultimo cliente Zenite Costa. Tenho que visualizar todos. Coloque paginação para melhorar a navegação */}
{/* adcione esta função na versão mobile */}
{/* ao excluir um cliente a lista não carrega corretamente aparece nenhum resultado encontrado. Arrume */}
import { lazy, Suspense, ComponentType } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhatsAppButton from "@/components/WhatsAppButton";
import BirthdayRoulette from "@/components/BirthdayRoulette";
import WelcomePromoPopup from "@/components/WelcomePromoPopup";

const CHUNK_RELOAD_KEY = "chunk_reload_ts";
const CHUNK_RELOAD_WINDOW_MS = 15_000;

const lazyRetry = (factory: () => Promise<{ default: ComponentType<any> }>) =>
  lazy(() =>
    factory().catch((err) => {
      const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
      if (Number.isNaN(lastReload) || Date.now() - lastReload > CHUNK_RELOAD_WINDOW_MS) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        const url = new URL(window.location.href);
        url.searchParams.set("reload", Date.now().toString());
        window.location.assign(url.toString());
      }
      throw err;
    })
  );

const About = lazyRetry(() => import("@/components/About"));
const Services = lazyRetry(() => import("@/components/Services"));
const Benefits = lazyRetry(() => import("@/components/Benefits"));
const GoogleReviews = lazyRetry(() => import("@/components/GoogleReviews"));
const Contact = lazyRetry(() => import("@/components/Contact"));
const Footer = lazyRetry(() => import("@/components/Footer"));

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-[200px]" />}>
    {children}
  </Suspense>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <LazySection><About /></LazySection>
      <LazySection><Services /></LazySection>
      <LazySection><Benefits /></LazySection>
      <LazySection><GoogleReviews /></LazySection>
      <LazySection><Contact /></LazySection>
      <LazySection><Footer /></LazySection>
      <WhatsAppButton />
      <BirthdayRoulette />
      <WelcomePromoPopup />
    </div>
  );
};

export default Index;
