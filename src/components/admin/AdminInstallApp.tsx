import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const AdminInstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 text-center space-y-6">
          {/* Icon */}
          <div className="w-24 h-24 rounded-[22px] bg-white shadow-lg border border-border flex items-center justify-center mx-auto overflow-hidden">
            {isInstalled ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            ) : (
              <img src="/pwa-512x512.png" alt="Rosa de Lis App" className="w-full h-full object-contain p-1" />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="font-heading text-xl font-bold text-foreground">
              {isInstalled ? "App instalado! ✅" : "Instalar o App"}
            </h3>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              {isInstalled
                ? "O Rosa de Lis já está instalado no seu dispositivo. Acesse diretamente pela tela inicial."
                : "Instale o Rosa de Lis no seu celular para acessar rapidamente sem precisar abrir o navegador."
              }
            </p>
          </div>

          {/* Action */}
          {isInstalled ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
              <p className="font-body text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Procure o ícone "Rosa de Lis" na tela inicial do seu celular
              </p>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              disabled={installing}
              size="lg"
              className="w-full gap-2 text-base"
            >
              <Download className="w-5 h-5" />
              {installing ? "Instalando..." : "Instalar agora"}
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                <p className="font-body text-sm font-semibold text-foreground">
                  Como instalar no iPhone / iPad:
                </p>
                <div className="space-y-2 text-left">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">1</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Toque no ícone <Share className="w-4 h-4 inline text-primary" /> de compartilhar no Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">2</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">3</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Confirme tocando em <strong>"Adicionar"</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-3">
                <p className="font-body text-sm font-semibold text-foreground">
                  Como instalar no Android:
                </p>
                <div className="space-y-2 text-left">
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">1</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Toque no menu <MoreVertical className="w-4 h-4 inline text-primary" /> do navegador (3 pontinhos)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">2</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-xs font-bold">3</span>
                    <p className="font-body text-sm text-muted-foreground">
                      Confirme a instalação
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shared link */}
          {!isInstalled && (
            <div className="pt-2 border-t border-border">
              <p className="font-body text-xs text-muted-foreground">
                Compartilhe este link com seus clientes para que instalem o app:
              </p>
              <p className="font-body text-sm font-semibold text-primary mt-1 break-all select-all">
                {window.location.origin}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminInstallApp;
