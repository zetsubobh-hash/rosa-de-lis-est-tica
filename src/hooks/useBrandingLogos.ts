import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallbackLogo from "@/assets/logo-branca.png";

const BUCKET = "branding";

export const useBrandingLogos = () => {
  const [logo, setLogo] = useState<string>(fallbackLogo);
  const [logoWhite, setLogoWhite] = useState<string>(fallbackLogo);

  useEffect(() => {
    const loadLogo = async (fileName: string, setter: (url: string) => void) => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
      try {
        const res = await fetch(data.publicUrl, { method: "HEAD" });
        if (res.ok) {
          setter(data.publicUrl + "?t=" + Date.now());
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
