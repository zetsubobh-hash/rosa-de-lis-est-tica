import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, RotateCcw, Paintbrush, Plus, Trash2, Check, Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ThemeColor {
  key: string;
  label: string;
  description: string;
  cssVar: string;
}

interface SavedTheme {
  id: string;
  name: string;
  colors: Record<string, string>;
  is_active: boolean;
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

function cssHslToHex(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 3) return "#e91e63";
  return hslToHex(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]));
}

function getCurrentCssVar(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getDefaultColors(): Record<string, string> {
  // Remove inline overrides to read CSS defaults
  THEME_COLORS.forEach((tc) => document.documentElement.style.removeProperty(tc.cssVar));
  const defaults: Record<string, string> = {};
  THEME_COLORS.forEach((tc) => {
    const current = getCurrentCssVar(tc.cssVar);
    defaults[tc.key] = current || "340 80% 55%";
  });
  return defaults;
}

function colorsToHex(hslColors: Record<string, string>): Record<string, string> {
  const hex: Record<string, string> = {};
  THEME_COLORS.forEach((tc) => {
    hex[tc.key] = hslColors[tc.key] ? cssHslToHex(hslColors[tc.key]) : "#e91e63";
  });
  return hex;
}

function applyColorsToDOM(hslColors: Record<string, string>) {
  THEME_COLORS.forEach((tc) => {
    if (hslColors[tc.key]) {
      document.documentElement.style.setProperty(tc.cssVar, hslColors[tc.key]);
    }
  });
}

const AdminThemeEditor = () => {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState<SavedTheme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState("");
  const [showNewTheme, setShowNewTheme] = useState(false);

  const fetchThemes = async () => {
    const { data } = await supabase
      .from("site_themes" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (data) {
      const parsed = (data as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        colors: typeof t.colors === "string" ? JSON.parse(t.colors) : t.colors,
        is_active: t.is_active,
      }));
      setThemes(parsed);
      const active = parsed.find((t) => t.is_active);
      if (active) {
        setActiveThemeId(active.id);
        setColors(colorsToHex(active.colors));
        applyColorsToDOM(active.colors);
      }
      return parsed;
    }
    return [];
  };

  useEffect(() => {
    const init = async () => {
      const loaded = await fetchThemes();
      if (!loaded || loaded.length === 0 || !loaded.find((t) => t.is_active)) {
        // No active theme — read current CSS
        const defaults = getDefaultColors();
        setColors(colorsToHex(defaults));
        // Re-apply defaults since getDefaultColors removes overrides
        applyColorsToDOM(defaults);
      }
      setLoading(false);
    };
    init();
  }, []);

  const applyPreview = useCallback((key: string, hex: string) => {
    const tc = THEME_COLORS.find((c) => c.key === key);
    if (!tc) return;
    document.documentElement.style.setProperty(tc.cssVar, hexToHsl(hex));
  }, []);

  const handleColorChange = (key: string, hex: string) => {
    setColors((prev) => ({ ...prev, [key]: hex }));
    applyPreview(key, hex);
  };

  // Save current colors as a NEW theme
  const handleSaveNewTheme = async () => {
    if (!newThemeName.trim()) {
      toast.error("Digite um nome para o tema");
      return;
    }
    setSaving(true);
    try {
      const hslColors: Record<string, string> = {};
      THEME_COLORS.forEach((tc) => {
        hslColors[tc.key] = hexToHsl(colors[tc.key]);
      });

      // Deactivate all others
      await supabase
        .from("site_themes" as any)
        .update({ is_active: false } as any)
        .eq("is_active", true);

      const { data, error } = await supabase
        .from("site_themes" as any)
        .insert({ name: newThemeName.trim(), colors: hslColors, is_active: true } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success(`Tema "${newThemeName.trim()}" salvo e ativado!`);
      setNewThemeName("");
      setShowNewTheme(false);
      await fetchThemes();
    } catch (err: any) {
      toast.error("Erro ao salvar tema: " + err.message);
    }
    setSaving(false);
  };

  // Update the currently active theme
  const handleUpdateTheme = async () => {
    if (!activeThemeId) {
      toast.error("Nenhum tema selecionado para atualizar");
      return;
    }
    setSaving(true);
    try {
      const hslColors: Record<string, string> = {};
      THEME_COLORS.forEach((tc) => {
        hslColors[tc.key] = hexToHsl(colors[tc.key]);
      });

      await supabase
        .from("site_themes" as any)
        .update({ colors: hslColors, updated_at: new Date().toISOString() } as any)
        .eq("id", activeThemeId);

      toast.success("Tema atualizado!");
      await fetchThemes();
    } catch {
      toast.error("Erro ao atualizar tema");
    }
    setSaving(false);
  };

  // Switch to a different theme
  const handleSelectTheme = async (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    try {
      // Deactivate all
      await supabase
        .from("site_themes" as any)
        .update({ is_active: false } as any)
        .eq("is_active", true);

      // Activate selected
      await supabase
        .from("site_themes" as any)
        .update({ is_active: true } as any)
        .eq("id", themeId);

      setActiveThemeId(themeId);
      setColors(colorsToHex(theme.colors));
      applyColorsToDOM(theme.colors);
      toast.success(`Tema "${theme.name}" ativado!`);
      await fetchThemes();
    } catch {
      toast.error("Erro ao ativar tema");
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      const theme = themes.find((t) => t.id === themeId);
      await supabase.from("site_themes" as any).delete().eq("id", themeId);
      toast.success(`Tema "${theme?.name}" excluído`);
      if (activeThemeId === themeId) {
        setActiveThemeId(null);
      }
      await fetchThemes();
    } catch {
      toast.error("Erro ao excluir tema");
    }
  };

  const handleReset = () => {
    const defaults = getDefaultColors();
    setColors(colorsToHex(defaults));
    applyColorsToDOM(defaults);
    toast.info("Cores restauradas ao padrão do CSS.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeTheme = themes.find((t) => t.id === activeThemeId);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Paintbrush className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">Editor de Tema</h3>
          <p className="font-body text-sm text-muted-foreground">
            Crie, salve e alterne entre temas personalizados.
          </p>
        </div>
      </div>

      {/* Saved themes selector */}
      {themes.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <Label className="font-body text-sm font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Tema Ativo
          </Label>
          <div className="flex items-center gap-3">
            <Select value={activeThemeId || ""} onValueChange={handleSelectTheme}>
              <SelectTrigger className="font-body flex-1">
                <SelectValue placeholder="Selecione um tema..." />
              </SelectTrigger>
              <SelectContent>
                {themes.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id} className="font-body">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Object.values(theme.colors).slice(0, 5).map((hsl, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 rounded-full border border-border/50 inline-block"
                            style={{ backgroundColor: `hsl(${hsl})` }}
                          />
                        ))}
                      </div>
                      {theme.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeTheme && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir tema "{activeTheme.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteTheme(activeTheme.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      )}

      {/* Color pickers */}
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

      {/* Actions */}
      <div className="space-y-4">
        {/* Save new theme */}
        {showNewTheme ? (
          <div className="flex items-end gap-3 p-4 bg-card rounded-xl border border-border">
            <div className="flex-1 space-y-1.5">
              <Label className="font-body text-sm font-medium">Nome do Tema</Label>
              <Input
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Ex: Rosa Clássico, Azul Moderno..."
                className="font-body"
                onKeyDown={(e) => e.key === "Enter" && handleSaveNewTheme()}
              />
            </div>
            <Button onClick={handleSaveNewTheme} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowNewTheme(false); setNewThemeName(""); }}>
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setShowNewTheme(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Salvar como Novo Tema
            </Button>
            {activeTheme && (
              <Button variant="secondary" onClick={handleUpdateTheme} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : `Atualizar "${activeTheme.name}"`}
              </Button>
            )}
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restaurar Padrão
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminThemeEditor;
