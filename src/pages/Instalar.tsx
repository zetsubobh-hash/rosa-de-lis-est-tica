import { useState, useEffect } from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Instalar = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(evt);

      // Auto-trigger install prompt immediately
      if (!prompted) {
        setPrompted(true);
        setTimeout(async () => {
          try {
            await evt.prompt();
            const { outcome } = await evt.userChoice;
            if (outcome === "accepted") setIsInstalled(true);
          } catch {}
        }, 500);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [prompted]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setIsInstalled(true);
      } catch {}
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full text-center space-y-6"
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              App instalado! ✅
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              Procure o ícone <strong className="text-foreground">Rosa de Lis</strong> na tela inicial do seu celular.
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Instalar Rosa de Lis
            </h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Tenha acesso rápido aos seus agendamentos direto da tela inicial do celular — sem precisar abrir o navegador.
            </p>

            {deferredPrompt && (
              <Button
                onClick={handleInstall}
                disabled={installing}
                size="lg"
                className="w-full gap-2 text-base"
              >
                <Download className="w-5 h-5" />
                {installing ? "Instalando..." : "Instalar agora"}
              </Button>
            )}

            {!deferredPrompt && (
              <div className="rounded-xl bg-muted/50 border border-border p-5 text-left space-y-3">
                {isIOS ? (
                  <>
                    <p className="font-body text-sm font-semibold text-foreground">
                      📱 Como instalar no iPhone/iPad:
                    </p>
                    <ol className="font-body text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Toque no ícone de <strong className="text-foreground">compartilhar</strong> (↑) do Safari</li>
                      <li>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
                      <li>Toque em <strong className="text-foreground">"Adicionar"</strong></li>
                    </ol>
                  </>
                ) : isAndroid ? (
                  <>
                    <p className="font-body text-sm font-semibold text-foreground">
                      📱 Como instalar no Android:
                    </p>
                    <ol className="font-body text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>Toque no menu <strong className="text-foreground">⋮</strong> (três pontos) do Chrome</li>
                      <li>Toque em <strong className="text-foreground">"Instalar aplicativo"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></li>
                      <li>Confirme tocando em <strong className="text-foreground">"Instalar"</strong></li>
                    </ol>
                  </>
                ) : (
                  <p className="font-body text-sm text-muted-foreground">
                    Abra este link no navegador <strong className="text-foreground">Chrome</strong> do seu celular para instalar o app.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Instalar;
