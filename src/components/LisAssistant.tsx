import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { HelpCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import lis from "@/assets/lis-assistente.png";

type Msg = { role: "user" | "assistant"; content: string };
const HELLO: Msg = { role: "assistant", content: "Oi! Eu sou a **Lis**, sua assistente do app Rosa de Lis 🌸 Pode me perguntar qualquer coisa: como agendar, usar a agenda, clientes, caixa, WhatsApp..." };

export default function LisAssistant() {
  const { isAdmin, isPartner, loading } = useUserRole();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  if (loading || (!isAdmin && !isPartner)) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = [...msgs, { role: "user" as const, content: text }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    const put = (c: string) => setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: c }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lis-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: history.slice(1).slice(-20) }),
      });
      if (!res.ok || !res.body) { put((await res.json().catch(() => null))?.error || "Não consegui responder agora."); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = "", out = "";
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const d = l.slice(5).trim(); if (d === "[DONE]") continue;
          try { const t = JSON.parse(d).choices?.[0]?.delta?.content; if (t) { out += t; put(out); } } catch { /* parcial */ }
        }
      }
      if (!out) put("Não consegui responder agora, tente de novo.");
    } catch { put("Não consegui responder agora, tente de novo."); }
    finally { setBusy(false); }
  };

  return (
    <>
      {!open && !dismissed && (
        <div className="fixed bottom-20 left-4 z-[60]">
          <img src={lis} alt="" aria-hidden className="pointer-events-none absolute -top-28 left-0 z-0 h-28 w-28 object-cover object-top" />
          <button onClick={() => setOpen(true)} aria-label="Abrir assistente Lis" className="relative z-10 mt-12 flex items-center rounded-3xl bg-background py-2 pl-24 pr-4 shadow-lg ring-1 ring-primary/20 transition-transform hover:scale-105">
            <span className="text-sm font-semibold text-primary">Posso te ajudar?</span>
          </button>
          <button onClick={() => setDismissed(true)} aria-label="Fechar assistente" className="absolute -right-2 top-10 rounded-full bg-background p-1 shadow ring-1 ring-border transition-transform hover:scale-110">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      {!open && dismissed && (
        <button onClick={() => { setDismissed(false); setOpen(true); }} aria-label="Abrir ajuda" className="fixed right-3 top-3 z-[60] flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-sm font-semibold text-primary shadow-lg ring-1 ring-primary/20 transition-transform hover:scale-105">
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-start bg-foreground/30 p-3 sm:items-end" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-background">
            <div className="flex items-center gap-3 bg-primary p-3 text-primary-foreground">
              <img src={lis} alt="Lis" className="h-14 w-14 rounded-full bg-primary-foreground object-cover object-top" />
              <div className="flex-1"><p className="font-semibold">Lis</p><p className="text-xs opacity-90">Assistente do app • tire suas dúvidas</p></div>
              <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <div className="prose prose-sm max-w-none [&_*]:text-inherit"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>
                </div>
              ))}
              <div ref={end} />
            </div>
            <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte à Lis..." className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <Button type="submit" size="icon" className="rounded-full" disabled={busy}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
