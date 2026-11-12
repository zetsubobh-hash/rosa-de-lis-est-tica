import { useState } from "react";
import { Share, SquarePlus, Plus, Ellipsis, Copy, Check, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIphoneInstallContext } from "@/lib/iphoneInstall";

export default function IphoneInstallGuide() {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const context = getIphoneInstallContext(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const url = `${window.location.origin}/instalar`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  };
  return <section className="space-y-5 text-left" aria-label="Instalação no iPhone">
    <div><h2 className="text-xl font-semibold text-foreground">No iPhone, adicione à Tela de Início</h2><p className="mt-2 text-sm text-muted-foreground">Não precisa baixar pela App Store. O ícone fica na tela inicial do seu iPhone.</p></div>
    {!context.isSafari && <div className="space-y-3 border-l-4 border-primary bg-muted p-4">
      <p className="flex items-center gap-2 font-semibold text-foreground"><Compass className="h-5 w-5 shrink-0 text-primary" />Primeiro, abra no Safari</p>
      <p className="text-sm text-muted-foreground">{context.isEmbedded ? "Você está no navegador de outro aplicativo. Toque em ⋯ ou no menu e procure Abrir no Safari ou Abrir no navegador." : "Copie o link abaixo, abra o Safari e cole na barra de endereço."}</p>
      <Button variant="outline" className="w-full" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? "Link copiado — abra o Safari" : "Copiar link para abrir no Safari"}</Button>
      {copyFailed && <><p className="text-sm text-muted-foreground">Toque no endereço para selecionar e copiar:</p><Input aria-label="Link de instalação" readOnly value={url} onFocus={(event) => event.target.select()} /></>}
    </div>}
    <ol className="divide-y divide-border border-y border-border">
      <li className="flex gap-3 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</span><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">Abra Compartilhar <Share className="h-6 w-6 text-primary" /></p><p className="mt-1 text-sm text-muted-foreground">No Safari, toque no quadrado com a seta para cima. Se não aparecer, toque em <Ellipsis className="inline h-5 w-5" /> e depois em Compartilhar.</p></div></li>
      <li className="flex gap-3 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</span><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 font-semibold text-foreground"><SquarePlus className="h-6 w-6 text-primary" />Adicionar à Tela de Início</p><p className="mt-1 text-sm text-muted-foreground">Role a lista de opções para cima até encontrar esse nome. Não é a opção Adicionar aos Favoritos.</p></div></li>
      <li className="flex gap-3 py-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</span><div className="min-w-0"><p className="flex items-center gap-2 font-semibold text-foreground"><Plus className="h-6 w-6 text-primary" />Confirme em Adicionar</p><p className="mt-1 text-sm text-muted-foreground">Se aparecer Abrir como App, deixe ligado. Depois procure o ícone Rosa de Lis na tela inicial e toque para entrar.</p></div></li>
    </ol>
    <details className="text-sm"><summary className="cursor-pointer font-semibold text-primary">Não encontrei Adicionar à Tela de Início</summary><p className="mt-3 text-muted-foreground">Confira se abriu no Safari, e não dentro do WhatsApp ou Instagram. Na lista de Compartilhar, role até o final e veja Editar Ações para adicionar essa opção, se disponível. Se ainda não aparecer, atualize o iPhone em Ajustes → Geral → Atualização de Software. Você também pode continuar usando o app pelo Safari.</p></details>
  </section>;
}