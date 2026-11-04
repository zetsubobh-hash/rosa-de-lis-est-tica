import { useRef, useState } from "react";
import { Plus, Trash2, Upload, Loader2, ImagePlus, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useServiceGallery, BeforeAfterCard, GalleryItem } from "@/components/ServiceGallery";

interface Props {
  serviceId: string;
  slug: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
}

const uploadImage = async (slug: string, file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `gallery/${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("service-images").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("service-images").getPublicUrl(path).data.publicUrl;
};

const ServiceGalleryEditor = ({ serviceId, slug, enabled, onEnabledChange }: Props) => {
  const { toast } = useToast();
  const { items, reload } = useServiceGallery(slug);
  const db = supabase as any;
  const [busy, setBusy] = useState<string | null>(null);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; field: "before_url" | "after_url" } | null>(null);

  const toggle = async (v: boolean) => {
    onEnabledChange(v);
    const { error } = await db.from("services").update({ gallery_enabled: v }).eq("id", serviceId);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); onEnabledChange(!v); return; }
    toast({ title: v ? "Galeria ativada ✅" : "Galeria desativada" });
  };

  const addPair = async () => {
    if (!before || !after) { toast({ title: "Selecione a foto do Antes e do Depois", variant: "destructive" }); return; }
    setBusy("add");
    try {
      const [b, a] = await Promise.all([uploadImage(slug, before), uploadImage(slug, after)]);
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), -1);
      const { error } = await db.from("service_gallery").insert({ service_slug: slug, before_url: b, after_url: a, caption: caption.trim() || null, sort_order: maxOrder + 1 });
      if (error) throw error;
      setBefore(null); setAfter(null); setCaption("");
      toast({ title: "Fotos salvas ✅" });
      reload();
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
    }
    setBusy(null);
  };

  const update = async (id: string, patch: Partial<GalleryItem>) => {
    const { error } = await db.from("service_gallery").update(patch).eq("id", id);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este antes e depois?")) return;
    await db.from("service_gallery").delete().eq("id", id);
    reload();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = items[idx], b = items[idx + dir];
    if (!a || !b) return;
    await Promise.all([
      db.from("service_gallery").update({ sort_order: b.sort_order === a.sort_order ? idx + dir : b.sort_order }).eq("id", a.id),
      db.from("service_gallery").update({ sort_order: b.sort_order === a.sort_order ? idx : a.sort_order }).eq("id", b.id),
    ]);
    reload();
  };

  const onReplace = async (file?: File) => {
    if (!file || !replaceTarget) return;
    setBusy(replaceTarget.id);
    try {
      const url = await uploadImage(slug, file);
      await update(replaceTarget.id, { [replaceTarget.field]: url } as any);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
    }
    setBusy(null); setReplaceTarget(null);
    if (replaceRef.current) replaceRef.current.value = "";
  };

  const PickBox = ({ label, file, onClick }: { label: string; file: File | null; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="relative aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/40 overflow-hidden flex flex-col items-center justify-center gap-2 text-muted-foreground bg-card">
      {file ? <img src={URL.createObjectURL(file)} alt={label} className="absolute inset-0 w-full h-full object-cover" /> : <ImagePlus className="w-7 h-7" />}
      <span className="relative px-2.5 py-1 rounded-full bg-background/90 font-body text-[11px] font-bold uppercase tracking-wider text-foreground">{label}</span>
    </button>
  );

  return (
    <section id="galeria-antes-depois" className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 scroll-mt-24">
      <div className="rounded-3xl border border-border bg-muted/40 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">Galeria Antes e Depois</h3>
            <p className="font-body text-xs text-muted-foreground">Aparece abaixo dos valores na página do serviço. Desligada, a página fica como está.</p>
          </div>
          <label className="flex items-center gap-2 font-body text-sm font-medium">
            <Switch checked={enabled} onCheckedChange={toggle} />
            {enabled ? "Ligada" : "Desligada"}
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-5 mb-6">
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-2">
              <div className="relative">
                <BeforeAfterCard item={item} />
                {busy === item.id && <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-3xl"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setReplaceTarget({ id: item.id, field: "before_url" }); replaceRef.current?.click(); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border font-body text-[11px] hover:bg-muted"><Upload className="w-3 h-3" />Trocar Antes</button>
                <button onClick={() => { setReplaceTarget({ id: item.id, field: "after_url" }); replaceRef.current?.click(); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border font-body text-[11px] hover:bg-muted"><Upload className="w-3 h-3" />Trocar Depois</button>
                <button disabled={idx === 0} onClick={() => move(idx, -1)} className="p-1.5 rounded-lg border border-border disabled:opacity-30" title="Subir"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button disabled={idx === items.length - 1} onClick={() => move(idx, 1)} className="p-1.5 rounded-lg border border-border disabled:opacity-30" title="Descer"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg border border-destructive/30 text-destructive ml-auto" title="Remover"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <Input
                defaultValue={item.caption || ""}
                placeholder="Legenda (opcional)"
                onBlur={(e) => { if ((e.target.value || null) !== item.caption) update(item.id, { caption: e.target.value.trim() || null }); }}
                className="h-8 font-body text-xs"
              />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-body text-sm font-semibold mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4" />Novo antes e depois</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <PickBox label="Antes" file={before} onClick={() => beforeRef.current?.click()} />
            <PickBox label="Depois" file={after} onClick={() => afterRef.current?.click()} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-md">
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda (opcional)" className="h-9 font-body text-sm" />
            <button onClick={addPair} disabled={busy === "add"} className="flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground font-body text-sm font-semibold disabled:opacity-50">
              {busy === "add" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Salvar fotos
            </button>
          </div>
        </div>

        <input ref={beforeRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBefore(e.target.files?.[0] || null)} />
        <input ref={afterRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAfter(e.target.files?.[0] || null)} />
        <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={(e) => onReplace(e.target.files?.[0])} />
      </div>
    </section>
  );
};

export default ServiceGalleryEditor;
