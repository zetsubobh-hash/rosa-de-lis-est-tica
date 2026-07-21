import { useEffect, useState } from "react";
import { Megaphone, Save, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import WelcomePromoPopup from "@/components/WelcomePromoPopup";

const KEYS = {
  enabled: "welcome_popup_enabled",
  title: "welcome_popup_title",
  subtitle: "welcome_popup_subtitle",
  cta: "welcome_popup_cta",
  link: "welcome_popup_link",
};

const DEFAULTS = {
  title: "🎁 Ganhe seu prêmio de boas-vindas!",
  subtitle: "Cadastre-se e gire a roleta — até 60% OFF ou sessão grátis!",
  cta: "Girar a Roleta",
  link: "/roleta-premio",
};

const WelcomePopupSettings = () => {
  const { settings, loading, updateSetting } = useSiteSettings();
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(DEFAULTS.title);
  const [subtitle, setSubtitle] = useState(DEFAULTS.subtitle);
  const [cta, setCta] = useState(DEFAULTS.cta);
  const [link, setLink] = useState(DEFAULTS.link);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (loading) return;
    setEnabled(settings[KEYS.enabled] === "true");
    setTitle(settings[KEYS.title] || DEFAULTS.title);
    setSubtitle(settings[KEYS.subtitle] || DEFAULTS.subtitle);
    setCta(settings[KEYS.cta] || DEFAULTS.cta);
    setLink(settings[KEYS.link] || DEFAULTS.link);
  }, [loading, settings]);

  const toggleEnabled = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    const { error } = await updateSetting(KEYS.enabled, newVal ? "true" : "false");
    if (error) {
      setEnabled(!newVal);
      toast.error("Erro ao salvar.");
      return;
    }
    toast.success(newVal ? "Pop-up ativado!" : "Pop-up desativado.");
  };

  const saveContent = async () => {
    setSaving(true);
    const results = await Promise.all([
      updateSetting(KEYS.title, title),
      updateSetting(KEYS.subtitle, subtitle),
      updateSetting(KEYS.cta, cta),
      updateSetting(KEYS.link, link),
    ]);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast.error("Erro ao salvar o conteúdo.");
      return;
    }
    toast.success("Conteúdo do pop-up salvo! ✨");
  };

  const openPreview = () => {
    // clear dismissal cookie so preview always shows
    localStorage.removeItem("welcome_popup_dismissed_at");
    setPreview(true);
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold text-foreground">Pop-up de Boas-Vindas</h2>
              <p className="font-body text-xs text-muted-foreground">
                Banner promocional exibido na página inicial para novos visitantes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Switch checked={enabled} onCheckedChange={toggleEnabled} />
            <span className={`font-body text-sm font-semibold ${enabled ? "text-primary" : "text-muted-foreground"}`}>
              {enabled ? "Ativado" : "Desativado"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Título
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Subtítulo
            </label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={180}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Texto do Botão
              </label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={40} />
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Link do Botão
              </label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/roleta-premio" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={saveContent} disabled={saving} className="gap-1">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar conteúdo"}
          </Button>
          <Button size="sm" variant="outline" onClick={openPreview} className="gap-1">
            <Eye className="w-4 h-4" /> Pré-visualizar
          </Button>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          💡 O pop-up aparece 1x a cada 12h por visitante. Fechá-lo suspende novas exibições nesse período.
        </p>
      </div>

      {preview && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(false);
          }}
        >
          <WelcomePromoPopup />
        </div>
      )}
    </>
  );
};

export default WelcomePopupSettings;
