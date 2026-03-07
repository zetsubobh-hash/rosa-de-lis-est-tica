import { lazy, Suspense } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhatsAppButton from "@/components/WhatsAppButton";

const About = lazy(() => import("@/components/About"));
const Services = lazy(() => import("@/components/Services"));
const Benefits = lazy(() => import("@/components/Benefits"));
const GoogleReviews = lazy(() => import("@/components/GoogleReviews"));
const Contact = lazy(() => import("@/components/Contact"));
const Footer = lazy(() => import("@/components/Footer"));

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
    </div>
  );
};

export default Index;
