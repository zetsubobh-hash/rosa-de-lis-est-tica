import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackView = async () => {
      const safePath = location.pathname.startsWith("/")
        ? location.pathname.slice(0, 300)
        : `/${location.pathname}`.slice(0, 300);
      await supabase.from("page_views").insert({
        path: safePath,
        referrer: document.referrer ? document.referrer.slice(0, 500) : null,
        user_agent: navigator.userAgent ? navigator.userAgent.slice(0, 500) : null,
      });
    };
    trackView();
  }, [location.pathname]);
};
