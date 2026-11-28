import { useEffect, useState } from "react";
import { ImageIcon, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GalleryMessage = {
  id: string;
  fromMe: boolean;
  timestamp: number;
  sender: string;
  kind: "text" | "image" | "audio" | "video" | "sticker" | "document";
  text: string;
  seconds: number;
};

export type GalleryChat = {
  jid: string;
  name: string;
  phone: string | null;
  unread: number;
  last: GalleryMessage | null;
};

type ImageEntry = { chat: GalleryChat; message: GalleryMessage };
type LoadedMedia = { src?: string; isThumbnail?: boolean; loading?: boolean; error?: string };

const phoneLabel = (chat: GalleryChat) =>
  chat.phone ? `+${chat.phone}` : chat.jid.endsWith("@g.us") ? "Grupo" : "Celular não informado pelo WhatsApp";

const dateTime = (seconds: number) =>
  seconds ? new Date(seconds * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

interface EvolutionImagesGalleryProps {
  invoke: <T>(body: object) => Promise<T>;
  refresh: number;
  onOpenConversation: (chat: GalleryChat) => void;
}

export function EvolutionImagesGallery({ invoke, refresh, onOpenConversation }: EvolutionImagesGalleryProps) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ImageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mediaMap, setMediaMap] = useState<Record<string, LoadedMedia>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMediaMap({});
    invoke<{ results: ImageEntry[]; total: number; pages: number }>({ action: "images", page })
      .then(data => {
        if (cancelled) return;
        setItems(data.results || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : "Não foi possível carregar as imagens"); setItems([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, refresh, invoke]);

  const fetchOne = async (entry: ImageEntry, cancelledRef?: { current: boolean }) => {
    const key = `${entry.chat.jid}:${entry.message.id}`;
    setMediaMap(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await invoke<{ available: boolean; mime?: string; base64?: string; isThumbnail?: boolean; error?: string }>({
        action: "media",
        jid: entry.chat.jid,
        id: entry.message.id,
      });
      if (cancelledRef?.current) return;
      if (!res.available || !res.mime || !res.base64) {
        setMediaMap(prev => ({ ...prev, [key]: { error: res.error || "Imagem indisponível" } }));
        return;
      }
      setMediaMap(prev => ({ ...prev, [key]: { src: `data:${res.mime};base64,${res.base64}`, isThumbnail: Boolean(res.isThumbnail) } }));
    } catch (e) {
      if (cancelledRef?.current) return;
      setMediaMap(prev => ({ ...prev, [key]: { error: e instanceof Error ? e.message : "Não foi possível abrir a imagem" } }));
    }
  };

  // Load visible page images with bounded concurrency so Evolution is never flooded.
  useEffect(() => {
    if (!items.length) return;
    const cancelledRef = { current: false };
    let cursor = 0;
    const worker = async () => {
      while (!cancelledRef.current && cursor < items.length) {
        const current = items[cursor++];
        if (current) await fetchOne(current, cancelledRef);
      }
    };
    const workers = Array.from({ length: Math.min(3, items.length) }, () => worker());
    void Promise.all(workers);
    return () => { cancelledRef.current = true; };
  }, [items]);

  return (
    <section aria-label="Galeria de imagens das conversas" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{loading ? "Carregando imagens…" : `${total} imagens salvas`}</p>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground">{page}/{pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma imagem encontrada no histórico salvo.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(entry => {
          const key = `${entry.chat.jid}:${entry.message.id}`;
          const state = mediaMap[key];
          return (
            <article key={key} className="border border-border rounded-lg overflow-hidden flex flex-col bg-card">
              <div className="aspect-[4/3] bg-muted flex items-center justify-center p-2 overflow-hidden">
                {state?.src ? (
                  <img src={state.src} alt={entry.message.text || `Imagem de ${entry.chat.name}`} className="max-h-full max-w-full object-contain rounded" />
                ) : state?.error ? (
                  <div className="text-center space-y-2 p-2">
                    <ImageIcon className="w-6 h-6 mx-auto text-muted-foreground" />
                    <p className="text-xs text-destructive">{state.error}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchOne(entry)}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between gap-2 min-w-0">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{entry.chat.name}</h3>
                  <p className="text-xs text-muted-foreground break-words">{phoneLabel(entry.chat)}</p>
                  <p className="text-[11px] text-muted-foreground">{entry.message.fromMe ? "Número da clínica" : "Contato"} · {dateTime(entry.message.timestamp)}</p>
                  {state?.isThumbnail && <p className="text-[11px] text-muted-foreground">Prévia salva na conversa</p>}
                  {entry.message.text && <p className="text-xs line-clamp-2 break-words">{entry.message.text}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpenConversation(entry.chat)} className="w-full gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />Ir para conversa
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Página {page} de {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </section>
  );
}