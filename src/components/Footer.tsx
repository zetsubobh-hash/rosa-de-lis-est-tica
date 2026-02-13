import { Instagram, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-branca.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { settings } = useSiteSettings();

  const phone = settings.phone || "(31) 99588-2521";
  const address = settings.address || "R. Francisco Castro Monteiro, 46 - Sala 704 - Buritis, Belo Horizonte - MG, 30575-835";
  const instagramUrl = settings.instagram_url || "#";
  const businessName = settings.business_name || "Rosa de Lis Estética";

  return (
    <footer className="bg-foreground py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Logo */}
          <div className="text-center md:text-left">
            <img src={logo} alt={businessName} className="h-14 w-auto mx-auto md:mx-0 mb-3 brightness-200" />
            <p className="font-body text-background/50 text-xs tracking-wider">
              Estética e Beleza
            </p>
          </div>

          {/* Contact info */}
          <div className="text-center space-y-2">
            <a href={`tel:${phone.replace(/\D/g, "")}`} className="flex items-center justify-center gap-2 text-background/70 hover:text-background transition-colors">
              <Phone size={14} />
              <span className="font-body text-sm">{phone}</span>
            </a>
            <div className="flex items-center justify-center gap-2 text-background/70">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="font-body text-sm">{address}</span>
            </div>
          </div>

          {/* Social */}
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-4">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors duration-300"
              >
                <Instagram size={18} className="text-background/80" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-background/40 text-xs tracking-wider">
            © {new Date().getFullYear()} {businessName}. Todos os direitos reservados.
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
