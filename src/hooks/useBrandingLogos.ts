import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import fallbackLogo from "@/assets/logo-branca.png";

const BUCKET = "branding";

export const useBrandingLogos = () => {
  const [logo, setLogo] = useState<string>(fallbackLogo);
  const [logoWhite, setLogoWhite] = useState<string>(fallbackLogo);

  useEffect(() => {
    const loadLogo = async (fileName: string, setter: (url: string) => void) => {
      try {
        const { data: files } = await supabase.storage.from(BUCKET).list("", {
          search: fileName,
          limit: 1,
        });
        if (files && files.some((f) => f.name === fileName)) {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
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
