import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-background/90 backdrop-blur-md shadow-sm" : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="#" className="font-heading text-2xl text-foreground tracking-wide">
          Rosa de Lis
        </a>
        <div className="hidden md:flex items-center gap-8">
          {["Serviços", "Sobre", "Contato"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
              className="font-body text-sm text-muted-foreground hover:text-foreground tracking-wide transition-colors duration-300"
            >
              {item}
            </a>
          ))}
        </div>
      </nav>
    </motion.header>
  );
};

export default Header;
