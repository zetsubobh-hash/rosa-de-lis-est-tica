import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackView = async () => {
      await supabase.from("page_views").insert({
        path: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    };
    trackView();
  }, [location.pathname]);
};
