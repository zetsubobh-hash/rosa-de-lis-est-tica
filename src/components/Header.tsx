import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-branca.png";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileName(null);
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, sex")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const greeting = data.sex === "masculino" ? "Seja bem-vindo" : "Seja bem-vinda";
        setProfileName(`${greeting}, ${data.full_name}, à Rosa de Lis Estética!`);
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
            <img src={logo} alt="Rosa de Lis" className="h-12 w-auto" />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="font-body text-sm text-primary-foreground/80 hover:text-primary-foreground tracking-wide transition-colors duration-300 uppercase font-medium"
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-2 font-body text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors uppercase tracking-wider font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
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
                className="block py-3 font-body text-sm text-primary-foreground/90 hover:text-primary-foreground uppercase tracking-wide font-medium border-b border-primary-foreground/10"
              >
                {item.label}
              </a>
            ))}
            {user ? (
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 font-body text-sm text-primary-foreground/80 hover:text-primary-foreground uppercase tracking-wider font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
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
            <p className="text-center font-body text-sm text-accent-foreground py-2 px-4">
              ✨ {profileName}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
};

export default Header;
