import { Instagram, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-branca.png";

const Footer = () => {
  return (
    <footer className="bg-foreground py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Logo */}
          <div className="text-center md:text-left">
            <img src={logo} alt="Rosa de Lis" className="h-14 w-auto mx-auto md:mx-0 mb-3 brightness-200" />
            <p className="font-body text-background/50 text-xs tracking-wider">
              Estética e Beleza
            </p>
          </div>

          {/* Contact info */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-background/70">
              <Phone size={14} />
              <span className="font-body text-sm">(11) 99999-9999</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-background/70">
              <MapPin size={14} />
              <span className="font-body text-sm">Rua das Flores, 123 — Centro</span>
            </div>
          </div>

          {/* Social */}
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors duration-300"
              >
                <Instagram size={18} className="text-background/80" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-background/40 text-xs tracking-wider">
            © {new Date().getFullYear()} Rosa de Lis Estética. Todos os direitos reservados.
          </p>
          <Link
            to="/politica-de-privacidade"
            className="font-body text-background/40 text-xs tracking-wider hover:text-background/70 transition-colors"
          >
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
