import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useBranding } from "@/hooks/useBranding";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useSEO } from "@/hooks/useSEO";
import { useErrorMonitor } from "@/hooks/useErrorMonitor";
import CookieConsent from "@/components/CookieConsent";

// Retry dynamic imports — reloads page once if chunk is missing (post-deploy cache issue)
const lazyRetry = (factory: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazy(() =>
    factory().catch((err) => {
      const key = "chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise(() => {}); // never resolves, page is reloading
      }
      sessionStorage.removeItem(key);
      throw err;
    })
  );

const Index = lazyRetry(() => import("./pages/Index"));
const ServiceDetail = lazyRetry(() => import("./pages/ServiceDetail"));
const Agendar = lazyRetry(() => import("./pages/Agendar"));
const Checkout = lazyRetry(() => import("./pages/Checkout"));
const MeusAgendamentos = lazyRetry(() => import("./pages/MeusAgendamentos"));
const MeuPerfil = lazyRetry(() => import("./pages/MeuPerfil"));
const Admin = lazyRetry(() => import("./pages/Admin"));
const PartnerDashboard = lazyRetry(() => import("./pages/PartnerDashboard"));
const PoliticaPrivacidade = lazyRetry(() => import("./pages/PoliticaPrivacidade"));
const Instalar = lazyRetry(() => import("./pages/Instalar"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

const AppInit = ({ children }: { children: React.ReactNode }) => {
  usePageTracking();
  useBranding();
  useThemeColors();
  useSEO();
  useErrorMonitor();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppInit>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/servico/:slug" element={<ServiceDetail />} />
                <Route path="/agendar/:slug" element={<Agendar />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/meus-agendamentos" element={<MeusAgendamentos />} />
                <Route path="/meu-perfil" element={<MeuPerfil />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/parceiro" element={<PartnerDashboard />} />
                <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/instalar" element={<Instalar />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <CookieConsent />
          </AppInit>
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
