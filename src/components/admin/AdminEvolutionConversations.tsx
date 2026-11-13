import { useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ArrowLeft, FileDown, ImageIcon, Loader2, MessageCircle, Mic, Play, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { id: string; fromMe: boolean; timestamp: number; sender: string; kind: "text" | "image" | "audio" | "video" | "sticker" | "document"; text: string; seconds: number };
type Chat = { jid: string; name: string; phone: string | null; unread: number; last: Message | null };
const phoneLabel = (chat: Chat) => chat.phone ? `+${chat.phone}` : chat.jid.endsWith("@g.us") ? "Grupo" : "Celular não informado pelo WhatsApp";
const dateTime = (seconds: number) => seconds ? new Date(seconds * 1000).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

async function request<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("evolution-conversations", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const text = await error.context.text();
      let message = "Não foi possível consultar as conversas";
      try { message = JSON.parse(text).error || message; } catch { /* Do not expose raw provider content. */ }
      throw new Error(message);
    }
    throw new Error("Não foi possível conectar. Tente atualizar as conversas.");
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function MessageMedia({ message, jid }: { message: Message; jid: string }) {
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const load = async () => {
    setLoading(true); setError("");
    try {
      const media = await request<{ available: boolean; mime?: string; base64?: string; error?: string }>({ action: "media", jid, id: message.id });
      if (!media.available || !media.mime || !media.base64) throw new Error(media.error || "Este arquivo não está mais disponível no WhatsApp.");
      if (active.current) setSource(`data:${media.mime};base64,${media.base64}`);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Não foi possível abrir a mídia"); }
    finally { if (active.current) setLoading(false); }
  };
  return <div className="space-y-2">
    {source ? (message.kind === "image" || message.kind === "sticker") ? <img src={source} alt={message.text || "Imagem da conversa"} className="max-h-96 max-w-full rounded object-contain" /> : message.kind === "video" ? <video controls src={source} className="max-h-96 max-w-full rounded" preload="metadata" />
      : message.kind === "document" ? <Button asChild variant="outline" size="sm"><a href={source} download="documento"><FileDown className="h-4 w-4 mr-2" />Baixar documento</a></Button>
      : <audio controls src={source} className="w-full max-w-full" preload="metadata" /> :
      <Button variant="outline" size="sm" disabled={loading} onClick={load} className="max-w-full whitespace-normal h-auto min-h-9 py-2 gap-2">
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : message.kind === "audio" ? <Mic className="h-4 w-4 shrink-0" /> : message.kind === "video" ? <Play className="h-4 w-4 shrink-0" /> : message.kind === "document" ? <FileDown className="h-4 w-4 shrink-0" /> : <ImageIcon className="h-4 w-4 shrink-0" />}
        {message.kind === "audio" ? `Ouvir áudio${message.seconds ? ` · ${message.seconds}s` : ""}` : message.kind === "video" ? "Abrir vídeo" : message.kind === "sticker" ? "Abrir figurinha" : message.kind === "document" ? "Carregar documento" : "Abrir imagem"}
      </Button>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}

export default function AdminEvolutionConversations() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [instance, setInstance] = useState("");
  const [messagePage, setMessagePage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatError, setChatError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [messageRefresh, setMessageRefresh] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [syncError, setSyncError] = useState("");
  const [syncWarning, setSyncWarning] = useState("");
  const [syncRun, setSyncRun] = useState(0);
  const messageRequest = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      setSyncing(true); setSyncError(""); setSyncWarning("");
      let nextPage = 1;
      let saved = 0;
      try {
        while (!cancelled) {
          setSyncStatus(`Salvando histórico · página ${nextPage} · ${saved} mensagens processadas`);
          const data = await request<{ saved: number; hasMore: boolean; nextPage: number; warning: string }>({ action: "sync", page: nextPage });
          if (cancelled) return;
          saved += data.saved;
          if (data.warning) setSyncWarning(data.warning);
          if (nextPage === 1 || !data.hasMore || nextPage % 5 === 0) setRefresh(r => r + 1);
          if (!data.hasMore) { setSyncStatus(`Histórico salvo · ${saved} mensagens processadas`); setMessageRefresh(r => r + 1); break; }
          if (data.nextPage <= nextPage) throw new Error("A importação não avançou. Tente atualizar novamente.");
          nextPage = data.nextPage;
        }
      } catch (e) { if (!cancelled) setSyncError(`Importação incompleta. ${e instanceof Error ? e.message : "Tente novamente."} As conversas já salvas foram preservadas.`); }
      finally { if (!cancelled) setSyncing(false); }
    };
    void sync();
    return () => { cancelled = true; };
  }, [syncRun]);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let cancelled = false;
    setLoadingChats(true); setChatError("");
    request<{ chats: Chat[]; pages: number; total: number; instance: string }>({ action: "chats", search: query, page })
      .then(data => { if (!cancelled) { setChats(data.chats); setPages(data.pages); setTotal(data.total); setInstance(data.instance); } })
      .catch(e => { if (!cancelled) { setChatError(e.message); setChats([]); } })
      .finally(() => { if (!cancelled) setLoadingChats(false); });
    return () => { cancelled = true; };
  }, [query, page, refresh]);
  const jid = selected?.jid;
  useEffect(() => {
    const version = ++messageRequest.current;
    setMessages([]); setMessagePage(1); setHasMore(false); setMessageError("");
    if (!jid) { setLoadingMessages(false); return; }
    setLoadingMessages(true);
    request<{ messages: Message[]; hasMore: boolean }>({ action: "messages", jid, page: 1 })
      .then(data => { if (version === messageRequest.current) { setMessages(data.messages); setHasMore(data.hasMore); } })
      .catch(e => { if (version === messageRequest.current) setMessageError(e.message); })
      .finally(() => { if (version === messageRequest.current) setLoadingMessages(false); });
    return () => { messageRequest.current++; };
  }, [jid, messageRefresh]);
  const loadMore = async () => {
    if (!jid) return;
    const version = messageRequest.current;
    setLoadingMessages(true); setMessageError("");
    try {
      const data = await request<{ messages: Message[]; hasMore: boolean }>({ action: "messages", jid, page: messagePage + 1 });
      if (version !== messageRequest.current) return;
      setMessages(current => [...new Map([...current, ...data.messages].map(m => [m.id, m])).values()].sort((a, b) => a.timestamp - b.timestamp));
      setMessagePage(p => p + 1); setHasMore(data.hasMore);
    } catch (e) { if (version === messageRequest.current) setMessageError(e instanceof Error ? e.message : "Não foi possível carregar"); }
    finally { if (version === messageRequest.current) setLoadingMessages(false); }
  };
  return <section className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-heading font-semibold">Conversas WhatsApp</h2><p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-4 h-4" />Walliston{instance ? ` · ${instance}` : ""}</p></div>
      <Button variant="outline" size="sm" onClick={() => setSyncRun(r => r + 1)} disabled={syncing}><RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Salvando histórico" : "Atualizar e salvar"}</Button>
    </header>
    {syncStatus && <p role="status" className="text-sm text-muted-foreground">{syncStatus}</p>}
    {syncError && <p role="alert" className="text-sm text-destructive">{syncError}</p>}
    {syncWarning && <p className="text-sm text-muted-foreground">{syncWarning}</p>}
    <div className="grid md:grid-cols-[minmax(220px,32%)_minmax(0,1fr)] border-y border-border min-h-[560px]">
      <aside className={`${selected ? "hidden md:flex" : "flex"} flex-col min-w-0 md:border-r border-border`}>
        <div className="relative m-3"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input aria-label="Buscar conversa por nome ou número" placeholder="Nome ou número" value={search} onChange={e => setSearch(e.target.value.slice(0, 100))} className="pl-9" /></div>
        <p className="px-3 pb-2 text-xs text-muted-foreground">{total} conversas</p>
        <div className="max-h-[65vh] overflow-y-auto flex-1">
          {loadingChats ? <p className="p-4 text-muted-foreground" role="status">Carregando conversas…</p> : chatError ? <p role="alert" className="p-4 text-destructive text-sm">{chatError}</p> : chats.length === 0 ? <p className="p-4 text-muted-foreground text-sm">Nenhuma conversa encontrada no histórico do Evolution.</p> : chats.map(chat => <Button key={chat.jid} variant="ghost" onClick={() => setSelected(chat)} className={`w-full h-auto min-h-20 rounded-none justify-start px-3 py-3 border-b border-border whitespace-normal ${selected?.jid === chat.jid ? "bg-accent" : ""}`}>
            <div className="text-left min-w-0 w-full space-y-1"><div className="font-semibold truncate">{chat.name}</div><div className="text-xs text-muted-foreground break-words">{phoneLabel(chat)}{chat.unread ? ` · ${chat.unread} não lidas` : ""}</div><div className="text-xs text-muted-foreground truncate">{chat.last?.text || (chat.last?.kind === "audio" ? "Áudio" : chat.last?.kind === "image" ? "Imagem" : chat.last?.kind === "video" ? "Vídeo" : chat.last?.kind === "sticker" ? "Figurinha" : chat.last?.kind === "document" ? "Documento" : "")}</div></div>
          </Button>)}
        </div>
        <div className="flex items-center justify-between gap-2 p-3 border-t border-border"><Button variant="outline" size="sm" disabled={page <= 1 || loadingChats} onClick={() => setPage(p => p - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">{page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages || loadingChats} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>
      </aside>
      <div className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-col`}>
        {selected ? <>
          <header className="flex items-center gap-2 p-3 border-b border-border"><Button variant="ghost" size="icon" aria-label="Voltar às conversas" onClick={() => setSelected(null)} className="md:hidden shrink-0"><ArrowLeft className="h-4 w-4" /></Button><div className="min-w-0"><h3 className="font-semibold truncate">{selected.name}</h3><p className="text-xs text-muted-foreground break-words">{phoneLabel(selected)}</p></div></header>
          <div className="flex-1 max-h-[70vh] overflow-y-auto p-3 md:p-5 space-y-4">
            {hasMore && <div className="text-center"><Button variant="outline" size="sm" disabled={loadingMessages} onClick={loadMore}>Carregar mais mensagens</Button></div>}
            {loadingMessages && <p role="status" className="text-sm text-muted-foreground">Carregando mensagens…</p>}
            {messageError && <p role="alert" className="text-sm text-destructive">{messageError}</p>}
            {!loadingMessages && !messageError && messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem salva nesta conversa.</p>}
            {messages.map(message => <article key={`${jid}-${message.id}`} className={`max-w-[92%] sm:max-w-[85%] w-fit min-w-0 rounded-lg px-3 py-2 ${message.fromMe ? "ml-auto bg-primary/10" : "bg-muted"}`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{message.fromMe ? "Número da clínica" : message.sender || selected.name}</p>
              {message.kind !== "text" && <MessageMedia key={`${jid}-${message.id}`} message={message} jid={selected.jid} />}
              {message.text && <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] mt-1">{message.text}</p>}
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{dateTime(message.timestamp)}</p>
            </article>)}
          </div>
        </> : <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8"><MessageCircle className="w-10 h-10" /><p>Selecione uma conversa</p></div>}
      </div>
    </div>
  </section>;
}