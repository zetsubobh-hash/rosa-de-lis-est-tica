import { useState, useEffect } from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import IphoneInstallGuide from "@/components/IphoneInstallGuide";
import { getIphoneInstallContext } from "@/lib/iphoneInstall";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Instalar = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const isIOS = getIphoneInstallContext(navigator.userAgent, navigator.platform, navigator.maxTouchPoints).isIOS;
  const [showIphoneGuide, setShowIphoneGuide] = useState(isIOS);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // QR Code costuma abrir no leitor/navegador do fabricante (Xiaomi, Samsung...), que só cria
  // "atalho" com moldura branca. No Android, reabrimos no Chrome, que instala o app de verdade.
  const ua = navigator.userAgent;
  const isRealChrome =
    /Chrome\/\d+/i.test(ua) && !/(MiuiBrowser|XiaoMi|SamsungBrowser|OPR|EdgA|Firefox|HeyTap|VivoBrowser|HuaweiBrowser|UCBrowser|; wv\))/i.test(ua);
  const chromeIntent = `intent://${window.location.host}/instalar#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;

  useEffect(() => {
    if (isAndroid && !isRealChrome && !window.matchMedia("(display-mode: standalone)").matches) {
      window.location.href = chromeIntent;
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
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
    <div className="min-h-screen bg-background flex items-start justify-center px-5 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {isInstalled ? (
          <>
            <CheckCircle2 className="w-20 h-20 text-primary mx-auto" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              App instalado! ✅
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              Procure o ícone <strong className="text-foreground">Rosa de Lis</strong> na tela inicial do seu celular.
            </p>
          </>
        ) : (
          <>
            <img src="/icons/rosadelis-app-v3-apple-180.png" alt="Rosa de Lis" className="h-20 w-20 mx-auto object-contain" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Instalar Rosa de Lis
            </h1>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Tenha acesso rápido aos seus agendamentos direto da tela inicial do celular — sem precisar abrir o navegador.
            </p>

            {isAndroid && !isRealChrome && (
              <Button asChild size="lg" className="w-full gap-2 text-base">
                <a href={chromeIntent}>Abrir no Chrome para instalar</a>
              </Button>
            )}

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

            {showIphoneGuide ? <IphoneInstallGuide /> : !deferredPrompt && (
              <div className="rounded-xl bg-muted/50 border border-border p-5 text-left space-y-3">
                {isAndroid ? (
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
                    Abra este link no celular: use o <strong className="text-foreground">Safari no iPhone</strong> ou o Chrome no Android.
                  </p>
                )}
              </div>
            )}
            {!isIOS && <Button variant="outline" className="w-full" onClick={() => setShowIphoneGuide((value) => !value)}><Smartphone className="h-4 w-4" />{showIphoneGuide ? "Voltar" : "Ver instalação no iPhone"}</Button>}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Instalar;
