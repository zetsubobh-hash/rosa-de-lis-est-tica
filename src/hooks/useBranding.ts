import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "branding";

export const useBranding = () => {
  useEffect(() => {
    const applyFavicon = () => {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl("favicon.png");
      const url = data.publicUrl + "?t=" + Date.now();

      // Remove existing favicon links
      document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']").forEach((el) => el.remove());

      // Create new favicon link
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = url;
      document.head.appendChild(link);
    };

    applyFavicon();
  }, []);
};
