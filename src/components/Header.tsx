import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, CalendarCheck, ShieldCheck, UserCircle, Handshake } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import AuthModal from "@/components/AuthModal";
import AvatarUpload from "@/components/AvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";


const Header = () => {
  
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { isAdmin, isPartner } = useUserRole();
  
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const sectionIds = ["sobre", "servicos", "beneficios", "contato"];
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      if (!isHome) return;
      const scrollPos = window.scrollY + 200;
      let found = "#";
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPos) {
          found = `#${sectionIds[i]}`;
          break;
        }
      }
      setActiveSection(found);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  useEffect(() => {
    if (!user) {
      setProfileName(null);
      setAvatarUrl(null);
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, sex, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const greeting = data.sex === "masculino" ? "Seja bem-vindo" : "Seja bem-vinda";
        setProfileName(`${greeting}, ${data.full_name}, à Rosa de Lis Estética!`);
        
        let finalAvatar = data.avatar_url || null;
        // Fallback: se não tem avatar no perfil, busca do parceiro
        if (!finalAvatar) {
          const { data: partnerData } = await supabase
            .from("partners")
            .select("avatar_url")
            .eq("user_id", user.id)
            .maybeSingle();
          if (partnerData?.avatar_url) {
            finalAvatar = partnerData.avatar_url;
          }
        }
        setAvatarUrl(finalAvatar);
      }
    };
    fetchProfile();
  }, [user]);

  const navItems = [
    { label: "Início", href: "#" },
    { label: "Sobre", href: "#sobre" },
    { label: "Serviços", href: "#servicos" },
    { label: "Benefícios", href: "#beneficios" },
    { label: "Contato", href: "#contato" },
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    setActiveSection(href);

    if (isHome) {
      if (href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      if (href !== "#") {
        setTimeout(() => {
          const el = document.querySelector(href);
          el?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  };

  const handleAgendar = () => {
    setMenuOpen(false);
    if (!user) {
      setAuthModalOpen(true);
    } else {
      // TODO: navigate to scheduling page
    }
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || !isHome
            ? "bg-primary/95 backdrop-blur-md shadow-lg"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => handleNavClick(e, "#")}
            className="flex items-center gap-2"
          >
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`font-body text-sm tracking-wide transition-colors duration-300 uppercase font-medium ${
                  activeSection === item.href
                    ? "text-primary-foreground border-b-2 border-primary-foreground pb-1"
                    : "text-primary-foreground/80 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-foreground/30 text-primary-foreground font-body text-xs font-semibold rounded-full hover:bg-primary-foreground/10 transition-all duration-300 uppercase tracking-wider"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </button>
                )}
                {(isPartner || isAdmin) && (
                  <button
                    onClick={() => navigate("/parceiro")}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-foreground/30 text-primary-foreground font-body text-xs font-semibold rounded-full hover:bg-primary-foreground/10 transition-all duration-300 uppercase tracking-wider"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    Parceiro
                  </button>
                )}
                <button
                  onClick={() => navigate("/meu-perfil")}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-foreground/30 text-primary-foreground font-body text-xs font-semibold rounded-full hover:bg-primary-foreground/10 transition-all duration-300 uppercase tracking-wider"
                >
                  <UserCircle className="w-3.5 h-3.5" />
                  Perfil
                </button>
                <button
                  onClick={() => navigate("/meus-agendamentos")}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-primary-foreground/30 text-primary-foreground font-body text-xs font-semibold rounded-full hover:bg-primary-foreground/10 transition-all duration-300 uppercase tracking-wider"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Agendamentos
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-foreground text-primary font-body text-xs font-semibold rounded-full hover:bg-primary-foreground/90 transition-all duration-300 uppercase tracking-wider"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={handleAgendar}
                className="px-6 py-2.5 bg-primary-foreground text-primary font-body text-sm font-semibold rounded-full hover:bg-primary-foreground/90 transition-all duration-300 uppercase tracking-wider"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-primary-foreground"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-primary/95 backdrop-blur-md px-6 pb-6"
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`block py-3 font-body text-sm uppercase tracking-wide font-medium border-b border-primary-foreground/10 ${
                  activeSection === item.href
                    ? "text-primary-foreground"
                    : "text-primary-foreground/60 hover:text-primary-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <div className="space-y-2 mt-4">
                {isAdmin && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/admin"); }}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-primary-foreground/30 text-primary-foreground font-body text-sm font-semibold rounded-full uppercase tracking-wider"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Painel Admin
                  </button>
                )}
                {(isPartner || isAdmin) && (
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/parceiro"); }}
                    className="flex items-center justify-center gap-2 w-full py-3 border border-primary-foreground/30 text-primary-foreground font-body text-sm font-semibold rounded-full uppercase tracking-wider"
                  >
                    <Handshake className="w-4 h-4" />
                    Painel Parceiro
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); navigate("/meu-perfil"); }}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-primary-foreground/30 text-primary-foreground font-body text-sm font-semibold rounded-full uppercase tracking-wider"
                >
                  <UserCircle className="w-4 h-4" />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate("/meus-agendamentos"); }}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-primary-foreground/30 text-primary-foreground font-body text-sm font-semibold rounded-full uppercase tracking-wider"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Meus Agendamentos
                </button>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-primary-foreground text-primary font-body text-sm font-semibold rounded-full uppercase tracking-wider"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={handleAgendar}
                className="mt-4 block w-full text-center px-6 py-3 bg-primary-foreground text-primary font-body text-sm font-semibold rounded-full uppercase tracking-wider"
              >
                Login
              </button>
            )}
          </motion.div>
        )}
      </motion.header>

      <AnimatePresence>
        {profileName && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="fixed top-[72px] left-0 right-0 z-40 bg-accent/90 backdrop-blur-sm border-b border-accent-foreground/10"
          >
            <div className="flex items-center justify-center gap-3 py-2 px-4">
              <AvatarUpload
                avatarUrl={avatarUrl}
                onAvatarChange={setAvatarUrl}
                size={36}
              />
              <p className="font-body text-sm text-accent-foreground">
                ✨ {profileName}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
};

export default Header;
