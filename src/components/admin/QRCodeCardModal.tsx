import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { X, Download, QrCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRCodeCardModalProps {
  open: boolean;
  onClose: () => void;
}

const PROD_URL = "https://rosadelis.com/roleta-premio";

const QRCodeCardModal = ({ open, onClose }: QRCodeCardModalProps) => {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !previewRef.current) return;
    QRCode.toCanvas(previewRef.current, PROD_URL, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#FFFFFF" },
    }).catch(console.error);
  }, [open]);

  const downloadHighRes = async (size: number, filename: string) => {
    setGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(PROD_URL, {
        width: size,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`QR Code ${size}x${size}px baixado!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar QR Code");
    }
    setGenerating(false);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(PROD_URL);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-3xl border border-border shadow-2xl max-w-md w-full p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground">QR Code do Cartão Premiado</h2>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Imprima no verso do cartão. Quem escanear cadastra e ganha 1 giro na roleta.
          </p>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white rounded-2xl border-2 border-border shadow-sm">
            <canvas ref={previewRef} className="block" />
          </div>
        </div>

        {/* URL */}
        <div className="bg-muted/50 rounded-xl p-3 mb-4 flex items-center justify-between gap-2">
          <code className="font-mono text-xs text-foreground truncate flex-1">{PROD_URL}</code>
          <button
            onClick={copyUrl}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-background transition-colors"
            title="Copiar link"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Download options */}
        <div className="space-y-2">
          <p className="font-body text-xs font-semibold text-foreground">Baixar para impressão:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadHighRes(512, "qrcode-cartao-premio-512.png")}
              disabled={generating}
              className="flex-col h-auto py-2 gap-0.5"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">512px</span>
              <span className="text-[10px] text-muted-foreground">Web</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadHighRes(1024, "qrcode-cartao-premio-1024.png")}
              disabled={generating}
              className="flex-col h-auto py-2 gap-0.5"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">1024px</span>
              <span className="text-[10px] text-muted-foreground">Padrão</span>
            </Button>
            <Button
              size="sm"
              onClick={() => downloadHighRes(2048, "qrcode-cartao-premio-2048.png")}
              disabled={generating}
              className="flex-col h-auto py-2 gap-0.5"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs">2048px</span>
              <span className="text-[10px] opacity-80">Alta res.</span>
            </Button>
          </div>
          <p className="font-body text-[10px] text-muted-foreground text-center pt-1">
            Recomendado: <strong>2048px</strong> para gráfica profissional (≥300 DPI no cartão).
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default QRCodeCardModal;
