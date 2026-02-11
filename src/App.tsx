import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { usePageTracking } from "@/hooks/usePageTracking";
import { useBranding } from "@/hooks/useBranding";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import ServiceDetail from "./pages/ServiceDetail";
import Agendar from "./pages/Agendar";
import Checkout from "./pages/Checkout";
import MeusAgendamentos from "./pages/MeusAgendamentos";
import MeuHistorico from "./pages/MeuHistorico";
import MeuPerfil from "./pages/MeuPerfil";
import Admin from "./pages/Admin";
import PartnerDashboard from "./pages/PartnerDashboard";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppInit = ({ children }: { children: React.ReactNode }) => {
  usePageTracking();
  useBranding(); // applies favicon dynamically
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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/servico/:slug" element={<ServiceDetail />} />
              <Route path="/agendar/:slug" element={<Agendar />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/meus-agendamentos" element={<MeusAgendamentos />} />
              <Route path="/meu-historico" element={<MeuHistorico />} />
              <Route path="/meu-perfil" element={<MeuPerfil />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/parceiro" element={<PartnerDashboard />} />
              <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </AppInit>
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
