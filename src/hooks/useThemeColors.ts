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
      // Load active theme from site_themes table
      const { data } = await supabase
        .from("site_themes" as any)
        .select("colors")
        .eq("is_active", true)
        .maybeSingle();

      if (data && (data as any).colors) {
        const colors = typeof (data as any).colors === "string"
          ? JSON.parse((data as any).colors)
          : (data as any).colors;

        Object.entries(colors).forEach(([key, value]) => {
          const cssVar = CSS_VAR_MAP[key];
          if (cssVar && value) {
            document.documentElement.style.setProperty(cssVar, value as string);
          }
        });
      }
    };

    applyTheme();
  }, []);
};
