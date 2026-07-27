import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, ImageIcon, X, Loader2, ShieldCheck, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoRow {
  id: string;
  kind: "before" | "after";
  storage_path: string;
  created_at: string;
  url?: string;
}

interface ProcedurePhotosProps {
  appointmentId: string;
  clientUserId: string;
  readOnly?: boolean;
}

const BUCKET = "procedure-photos";

const ProcedurePhotos = ({ appointmentId, clientUserId, readOnly = false }: ProcedurePhotosProps) => {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [lightbox, setLightbox] = useState<PhotoRow | null>(null);
  const beforeInput = useRef<HTMLInputElement>(null);
  const afterInput = useRef<HTMLInputElement>(null);

  // Termo de autorização de uso de imagem
  const [consent, setConsent] = useState<{ authorized: boolean; signature: string | null; date: string | null } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signature, setSignature] = useState("");
  const [savingConsent, setSavingConsent] = useState(false);
  const [showTerm, setShowTerm] = useState(false);

  const loadConsent = async () => {
    const { data } = await supabase
      .from("anamnesis" as any)
      .select("id, autorizacao_imagem, assinatura_cliente, data_assinatura")
      .eq("user_id", clientUserId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const row: any = (data || [])[0];
    setConsent({
      authorized: !!row?.autorizacao_imagem,
      signature: row?.assinatura_cliente || null,
      date: row?.data_assinatura || null,
    });
  };

  const saveConsent = async () => {
    if (!consentChecked) {
      toast.error("Marque a caixa de aceite do termo");
      return;
    }
    if (signature.trim().length < 3) {
      toast.error("Informe o nome completo do cliente para assinatura");
      return;
    }
    setSavingConsent(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("anamnesis" as any)
      .select("id")
      .eq("user_id", clientUserId)
      .order("updated_at", { ascending: false })
      .limit(1);
    const row: any = (existing || [])[0];

    const payload = {
      autorizacao_imagem: true,
      assinatura_cliente: signature.trim(),
      data_assinatura: today,
    };

    const { error } = row?.id
      ? await supabase.from("anamnesis" as any).update(payload as any).eq("id", row.id)
      : await supabase.from("anamnesis" as any).insert({ user_id: clientUserId, ...payload } as any);

    if (error) {
      toast.error("Erro ao registrar autorização");
    } else {
      toast.success("Autorização de uso de imagem registrada");
      setConsent({ authorized: true, signature: signature.trim(), date: today });
    }
    setSavingConsent(false);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("procedure_photos" as any)
      .select("id, kind, storage_path, created_at")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: true });

    const rows = (data || []) as unknown as PhotoRow[];
    if (rows.length) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(rows.map((r) => r.storage_path), 3600);
      rows.forEach((r, i) => {
        r.url = signed?.[i]?.signedUrl || undefined;
      });
    }
    setPhotos(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  useEffect(() => {
    loadConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientUserId]);

  const handleUpload = async (kind: "before" | "after", file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 8MB)");
      return;
    }
    setUploading(kind);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${clientUserId}/${appointmentId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (upErr) {
      toast.error("Erro ao enviar foto");
      setUploading(null);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("procedure_photos" as any).insert({
      appointment_id: appointmentId,
      user_id: clientUserId,
      kind,
      storage_path: path,
      created_by: auth?.user?.id || null,
    } as any);
    if (error) {
      toast.error("Erro ao registrar foto");
      await supabase.storage.from(BUCKET).remove([path]);
    } else {
      toast.success(kind === "before" ? "Foto do antes enviada!" : "Foto do depois enviada!");
      await load();
    }
    setUploading(null);
  };

  const handleDelete = async (photo: PhotoRow) => {
    if (!confirm("Excluir esta foto?")) return;
    const { error } = await supabase.from("procedure_photos" as any).delete().eq("id", photo.id);
    if (error) {
      toast.error("Erro ao excluir foto");
      return;
    }
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    toast.success("Foto excluída");
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  const renderColumn = (kind: "before" | "after") => {
    const list = photos.filter((p) => p.kind === kind);
    const label = kind === "before" ? "Antes" : "Depois";
    const inputRef = kind === "before" ? beforeInput : afterInput;
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-muted/20 p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-body text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          {!readOnly && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleUpload(kind, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading !== null}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {uploading === kind ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Enviar
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="h-20 flex flex-col items-center justify-center text-center gap-1">
            <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
            <p className="font-body text-[10px] text-muted-foreground">Sem fotos</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {list.map((p) => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                <button type="button" onClick={() => setLightbox(p)} className="w-full h-full">
                  <img src={p.url} alt={`Foto ${label}`} loading="lazy" className="w-full h-full object-cover" />
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    aria-label="Excluir foto"
                    className="absolute top-1 right-1 p-1 rounded-md bg-background/80 text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pt-1">
      <p className="font-body text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">📸 Fotos antes e depois</p>
      {/* Termo de autorização de uso de imagem */}
      <div className="mb-2 rounded-xl border border-border bg-muted/20 p-3">
        {consent?.authorized ? (
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-body text-[12px] font-semibold text-foreground">Autorização de uso de imagem registrada</p>
              <p className="font-body text-[11px] text-muted-foreground break-words">
                Assinado por {consent.signature || "cliente"}
                {consent.date ? ` em ${new Date(consent.date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
              </p>
              <button
                type="button"
                onClick={() => setShowTerm((v) => !v)}
                className="font-body text-[11px] text-primary underline mt-1"
              >
                {showTerm ? "Ocultar termo" : "Ver termo"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <FileSignature className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="min-w-0 w-full">
              <p className="font-body text-[12px] font-semibold text-foreground">Termo de autorização de uso de imagem pendente</p>
              <p className="font-body text-[11px] text-muted-foreground">
                O envio de fotos só é liberado após o aceite do termo pelo cliente.
              </p>
              <button
                type="button"
                onClick={() => setShowTerm((v) => !v)}
                className="font-body text-[11px] text-primary underline mt-1"
              >
                {showTerm ? "Ocultar termo" : "Ler termo completo"}
              </button>
            </div>
          </div>
        )}

        {showTerm && (
          <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border bg-background p-3 font-body text-[11px] leading-relaxed text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM</p>
            <p>
              Autorizo, de forma livre, expressa, gratuita e por prazo indeterminado, o uso das minhas imagens
              (fotografias e vídeos) captadas antes, durante e após os procedimentos estéticos realizados nesta clínica,
              para fins de divulgação institucional, educativa e publicitária, incluindo publicação em redes sociais
              (Instagram, Facebook, TikTok, WhatsApp e similares), site, materiais impressos e digitais.
            </p>
            <p>
              Declaro estar ciente de que as imagens poderão ser editadas (recorte, ajuste de cor, marca d'água), sem
              alteração do resultado do procedimento, e de que não terei direito a qualquer remuneração, pagamento ou
              indenização pela veiculação, presente ou futura.
            </p>
            <p>
              Nos termos da Lei nº 13.709/2018 (LGPD) e do art. 20 do Código Civil, autorizo o tratamento dos meus dados
              pessoais e da minha imagem para as finalidades acima, podendo revogar esta autorização a qualquer momento
              mediante solicitação escrita à clínica, hipótese em que a publicação das imagens será interrompida,
              preservadas as veiculações já realizadas antes da revogação.
            </p>
            <p>
              As imagens não serão utilizadas em contexto que exponha o titular a situação vexatória ou ofensiva à sua
              honra, e os dados de identificação (nome, contato) não serão divulgados sem autorização adicional.
            </p>
            <p>
              Ao assinar digitalmente abaixo, declaro ter lido e compreendido integralmente este termo e concordo com
              todas as suas cláusulas.
            </p>
          </div>
        )}

        {!consent?.authorized && !readOnly && (
          <div className="mt-2 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="font-body text-[11px] text-foreground">
                O cliente leu e concorda com o termo de autorização de uso de imagem para publicação em redes sociais e
                materiais de divulgação.
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Nome completo do cliente (assinatura digital)"
                className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 font-body text-[12px] text-foreground"
              />
              <button
                type="button"
                onClick={saveConsent}
                disabled={savingConsent}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-body text-[12px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingConsent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Registrar autorização
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {renderColumn("before")}
        {renderColumn("after")}
      </div>


      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setLightbox(null)}
        >
          <div className="relative max-w-3xl w-full">
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Fechar"
              className="absolute -top-10 right-0 p-2 rounded-full bg-background/90 text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.kind === "before" ? "Foto antes" : "Foto depois"}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcedurePhotos;
