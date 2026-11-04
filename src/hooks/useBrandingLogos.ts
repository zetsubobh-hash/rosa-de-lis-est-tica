import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallbackLogo from "@/assets/logo-branca.png";

const BUCKET = "branding";

export const useBrandingLogos = () => {
  const cached = (k: string) => {
    try { return localStorage.getItem("brand_" + k) || fallbackLogo; } catch { return fallbackLogo; }
  };
  const [logo, setLogo] = useState<string>(() => cached("logo.png"));
  const [logoWhite, setLogoWhite] = useState<string>(() => cached("logo-white.png"));

  useEffect(() => {
    const loadLogo = async (fileName: string, setter: (url: string) => void) => {
      try {
        const { data: files } = await supabase.storage.from(BUCKET).list("", {
          search: fileName,
          limit: 1,
        });
        if (files && files.some((f) => f.name === fileName)) {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
          const day = new Date().toISOString().slice(0, 10);
          const url = data.publicUrl + "?v=" + day;
          try { localStorage.setItem("brand_" + fileName, url); } catch { /* ignore */ }
          setter(url);
        }
      } catch {
        // keep fallback
      }
    };

    loadLogo("logo.png", setLogo);
    loadLogo("logo-white.png", setLogoWhite);
  }, []);

  return { logo, logoWhite };
};
