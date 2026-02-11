import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "branding";

interface Branding {
  logoUrl: string | null;
  faviconUrl: string | null;
}

export const useBranding = () => {
  const [branding, setBranding] = useState<Branding>({ logoUrl: null, faviconUrl: null });

  useEffect(() => {
    const loadBranding = async () => {
      const logoPath = "logo.png";
      const faviconPath = "favicon.png";

      const { data: logoData } = supabase.storage.from(BUCKET).getPublicUrl(logoPath);
      const { data: faviconData } = supabase.storage.from(BUCKET).getPublicUrl(faviconPath);

      // Check if files exist
      const [logoRes, faviconRes] = await Promise.all([
        fetch(logoData.publicUrl, { method: "HEAD" }).catch(() => null),
        fetch(faviconData.publicUrl, { method: "HEAD" }).catch(() => null),
      ]);

      setBranding({
        logoUrl: logoRes?.ok ? logoData.publicUrl + "?t=" + Date.now() : null,
        faviconUrl: faviconRes?.ok ? faviconData.publicUrl + "?t=" + Date.now() : null,
      });

      // Apply favicon dynamically
      if (faviconRes?.ok) {
        let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = faviconData.publicUrl + "?t=" + Date.now();
      }
    };

    loadBranding();
  }, []);

  return branding;
};
