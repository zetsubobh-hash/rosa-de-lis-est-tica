import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Save, Download, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NUMBER_KEY = "whatsapp_qr_target_number";
const MESSAGE_KEY = "whatsapp_qr_target_message";

const formatMask = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  const d = local.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const getLocalDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") ? digits.slice(2) : digits;
};

const toRaw = (value: string) => {
  const local = getLocalDigits(value);
  return local.length > 0 ? `55${local.slice(0, 11)}` : "";
};

const WhatsAppQRGenerator = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const rawNumber = toRaw(number);
  const waUrl = rawNumber
    ? `https://wa.me/${rawNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}`
    : "";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", [NUMBER_KEY, MESSAGE_KEY]);
      const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
      if (map[NUMBER_KEY]) setNumber(formatMask(map[NUMBER_KEY]));
      if (map[MESSAGE_KEY]) setMessage(map[MESSAGE_KEY]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!waUrl) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }
    QRCode.toCanvas(canvasRef.current, waUrl, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#FFFFFF" },
    }).catch(console.error);
  }, [waUrl]);

  const handleSave = async () => {
    const localDigits = getLocalDigits(number);
    if (localDigits.length !== 10 && localDigits.length !== 11) {
      toast({
        title: "Digite um número válido",
        description: "Informe DDD + número com 10 ou 11 dígitos.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const rows = [
      { key: NUMBER_KEY, value: rawNumber },
      { key: MESSAGE_KEY, value: message || "" },
    ];
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setNumber(formatMask(rawNumber));
      toast({ title: "Número salvo!" });
    }
  };

  const handleDownload = async () => {
    if (!waUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(waUrl, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qrcode-whatsapp-${rawNumber}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao gerar QR", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">Gerador de QR Code WhatsApp</h3>
          <p className="font-body text-xs text-muted-foreground">
            Cria um QR que abre uma conversa no número informado.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                Número de destino
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground pointer-events-none">
                  +55
                </span>
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => setNumber(formatMask(e.target.value))}
                  placeholder="(31) 99999-9999"
                  maxLength={15}
                  className="w-full h-10 pl-12 pr-3 rounded-xl border border-border bg-background font-body text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-body text-xs font-semibold text-foreground mb-1 block">
                Mensagem inicial (opcional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá! Vim pelo QR Code."
                rows={2}
                maxLength={500}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-body text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar número
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2 border-t border-border">
            <div className="p-3 bg-white rounded-2xl border-2 border-border">
              <canvas ref={canvasRef} className="block" width={260} height={260} />
            </div>
            {waUrl ? (
              <>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-primary underline break-all text-center"
                >
                  {waUrl}
                </a>
                <button
                  onClick={handleDownload}
                  className="w-full h-10 rounded-xl border border-border font-body text-sm font-semibold flex items-center justify-center gap-2 hover:bg-muted"
                >
                  <Download className="w-4 h-4" />
                  Baixar QR Code (1024px)
                </button>
              </>
            ) : (
              <p className="font-body text-xs text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                Digite um número para gerar o QR.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WhatsAppQRGenerator;
