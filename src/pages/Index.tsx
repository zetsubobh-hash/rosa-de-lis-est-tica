import { lazy, Suspense, ComponentType } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhatsAppButton from "@/components/WhatsAppButton";
import BirthdayRoulette from "@/components/BirthdayRoulette";

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
    </div>
  );
};

export default Index;
