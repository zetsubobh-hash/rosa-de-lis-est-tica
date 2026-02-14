import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, RotateCcw, Paintbrush } from "lucide-react";

interface ThemeColor {
  key: string;
  label: string;
  description: string;
  cssVar: string;
}

const THEME_COLORS: ThemeColor[] = [
  { key: "theme_primary", label: "Cor Principal", description: "Botões, links, destaques e elementos de ação", cssVar: "--primary" },
  { key: "theme_primary_foreground", label: "Texto da Cor Principal", description: "Texto sobre a cor principal (ex: texto dos botões)", cssVar: "--primary-foreground" },
  { key: "theme_background", label: "Fundo do Site", description: "Cor de fundo geral do site", cssVar: "--background" },
  { key: "theme_foreground", label: "Texto Geral", description: "Cor do texto principal do site", cssVar: "--foreground" },
  { key: "theme_card", label: "Fundo dos Cards", description: "Cor de fundo dos cards e seções", cssVar: "--card" },
  { key: "theme_card_foreground", label: "Texto dos Cards", description: "Cor do texto dentro dos cards", cssVar: "--card-foreground" },
  { key: "theme_muted", label: "Fundo Atenuado", description: "Seções e áreas de fundo discretas", cssVar: "--muted" },
  { key: "theme_muted_foreground", label: "Texto Atenuado", description: "Texto secundário e legendas", cssVar: "--muted-foreground" },
  { key: "theme_accent", label: "Cor de Destaque", description: "Menus hover, badges e destaques secundários", cssVar: "--accent" },
  { key: "theme_border", label: "Bordas", description: "Cor das bordas e divisores", cssVar: "--border" },
  { key: "theme_pink_dark", label: "Rodapé / Sidebar Admin", description: "Gradiente do rodapé e painel administrativo", cssVar: "--pink-dark" },
  { key: "theme_pink_light", label: "Fundo Rosa Claro", description: "Fundo de seções com destaque suave", cssVar: "--pink-light" },
  { key: "theme_gold", label: "Cor Dourada", description: "Destaques premium e ícones especiais", cssVar: "--gold" },
];

// Convert HSL string "H S% L%" to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert hex to HSL values "H S% L%"
function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Parse CSS var value "H S% L%" to hex
function cssHslToHex(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) return "#e91e63";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  return hslToHex(h, s, l);
}

// Read current CSS variable value from :root
function getCurrentCssVar(varName: string): string {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(varName).trim();
}

const AdminThemeEditor = () => {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved theme from DB, fallback to current CSS values
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value")
        .like("key", "theme_%");

      const saved: Record<string, string> = {};
      if (data) {
        (data as any[]).forEach((row) => {
          saved[row.key] = row.value;
        });
      }

      // Build initial colors: saved HSL → hex, or read from current CSS
      const initial: Record<string, string> = {};
      THEME_COLORS.forEach((tc) => {
        if (saved[tc.key]) {
          initial[tc.key] = cssHslToHex(saved[tc.key]);
        } else {
          const current = getCurrentCssVar(tc.cssVar);
          initial[tc.key] = current ? cssHslToHex(current) : "#e91e63";
        }
      });
      setColors(initial);
      setLoading(false);
    };
    load();
  }, []);

  // Live preview: apply colors to :root as user picks
  const applyPreview = useCallback((key: string, hex: string) => {
    const tc = THEME_COLORS.find((c) => c.key === key);
    if (!tc) return;
    const hsl = hexToHsl(hex);
    document.documentElement.style.setProperty(tc.cssVar, hsl);
  }, []);

  const handleColorChange = (key: string, hex: string) => {
    setColors((prev) => ({ ...prev, [key]: hex }));
    applyPreview(key, hex);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const tc of THEME_COLORS) {
        const hslValue = hexToHsl(colors[tc.key]);
        // Upsert: try update, if no rows affected, insert
        const { data: existing } = await supabase
          .from("site_settings" as any)
          .select("id")
          .eq("key", tc.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("site_settings" as any)
            .update({ value: hslValue, updated_at: new Date().toISOString() } as any)
            .eq("key", tc.key);
        } else {
          await supabase
            .from("site_settings" as any)
            .insert({ key: tc.key, value: hslValue } as any);
        }
      }
      toast.success("Tema salvo com sucesso! As cores serão aplicadas em todo o site.");
    } catch {
      toast.error("Erro ao salvar tema");
    }
    setSaving(false);
  };

  const handleReset = () => {
    // Re-read from CSS defaults (remove inline overrides)
    THEME_COLORS.forEach((tc) => {
      document.documentElement.style.removeProperty(tc.cssVar);
    });
    const initial: Record<string, string> = {};
    THEME_COLORS.forEach((tc) => {
      const current = getCurrentCssVar(tc.cssVar);
      initial[tc.key] = current ? cssHslToHex(current) : "#e91e63";
    });
    setColors(initial);
    toast.info("Cores restauradas ao padrão. Salve para confirmar.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">Editor de Tema</h3>
          <p className="font-body text-sm text-muted-foreground">
            Personalize as cores do site. A prévia é aplicada em tempo real.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {THEME_COLORS.map((tc) => (
          <div
            key={tc.key}
            className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
          >
            <label
              htmlFor={`color-${tc.key}`}
              className="relative w-12 h-12 rounded-xl border-2 border-border overflow-hidden cursor-pointer shrink-0 transition-shadow hover:shadow-md"
              style={{ backgroundColor: colors[tc.key] }}
            >
              <input
                id={`color-${tc.key}`}
                type="color"
                value={colors[tc.key]}
                onChange={(e) => handleColorChange(tc.key, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <div className="min-w-0 flex-1">
              <Label className="font-body text-sm font-semibold text-foreground">{tc.label}</Label>
              <p className="font-body text-xs text-muted-foreground mt-0.5">{tc.description}</p>
              <span className="font-body text-xs text-muted-foreground/60 uppercase tracking-wider">{colors[tc.key]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Tema"}
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrão
        </Button>
      </div>
    </div>
  );
};

export default AdminThemeEditor;
