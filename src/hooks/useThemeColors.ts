import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CSS_VAR_MAP: Record<string, string> = {
  theme_primary: "--primary",
  theme_primary_foreground: "--primary-foreground",
  theme_background: "--background",
  theme_foreground: "--foreground",
  theme_card: "--card",
  theme_card_foreground: "--card-foreground",
  theme_muted: "--muted",
  theme_muted_foreground: "--muted-foreground",
  theme_accent: "--accent",
  theme_border: "--border",
  theme_pink_dark: "--pink-dark",
  theme_pink_light: "--pink-light",
  theme_gold: "--gold",
};

export const useThemeColors = () => {
  useEffect(() => {
    const applyTheme = async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value")
        .like("key", "theme_%");

      if (data && (data as any[]).length > 0) {
        (data as any[]).forEach((row) => {
          const cssVar = CSS_VAR_MAP[row.key];
          if (cssVar && row.value) {
            document.documentElement.style.setProperty(cssVar, row.value);
          }
        });
      }
    };

    applyTheme();
  }, []);
};
