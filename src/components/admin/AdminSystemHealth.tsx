import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Database, RefreshCw, Wrench, CheckCircle2, AlertTriangle, XCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";

type Health = {
  db_size_bytes: number; cron_log_bytes: number; net_log_bytes: number;
  audit_rows: number; page_view_rows: number; connections: number; max_connections: number;
  stale_pending: number; checked_at: string;
};
type Level = "ok" | "warn" | "bad";

const LIMIT_BYTES = 500 * 1024 * 1024;
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

const levelOf = (value: number, warn: number, bad: number): Level => (value >= bad ? "bad" : value >= warn ? "warn" : "ok");

const Badge = ({ level }: { level: Level }) => {
  const map = {
    ok: { Icon: CheckCircle2, cls: "text-primary", label: "Bom" },
    warn: { Icon: AlertTriangle, cls: "text-muted-foreground", label: "Atenção" },
    bad: { Icon: XCircle, cls: "text-destructive", label: "Problema" },
  }[level];
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${map.cls}`}><map.Icon className="w-4 h-4" />{map.label}</span>;
};

const AdminSystemHealth = () => {
  const [health, setHealth] = useState<Health | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const check = useCallback(async () => {
    setLoading(true); setError(null);
    const t0 = performance.now();
    const { data, error } = await supabase.rpc("system_health" as never);
    setLatency(Math.round(performance.now() - t0));
    if (error) setError("O banco não respondeu. Tente novamente em alguns segundos.");
    else setHealth(data as unknown as Health);
    const { data: s } = await supabase.auth.getSession();
    if (s.session) {
      const { error: uErr } = await supabase.auth.getUser();
      setAuthOk(!uErr);
    } else setAuthOk(false);
    setLoading(false);
  }, []);

  const runMaintenance = useCallback(async (silent = false) => {
    setFixing(true);
    const { data, error } = await supabase.rpc("system_maintenance" as never);
    setFixing(false);
    if (error) { if (!silent) toast.error("Não foi possível fazer a manutenção agora."); return; }
    const d = data as Record<string, number>;
    const total = Object.values(d).reduce((a, b) => a + (b || 0), 0);
    if (!silent) toast.success(`Manutenção concluída: ${total} registros técnicos antigos removidos.`);
    localStorage.setItem("last_system_maintenance", String(Date.now()));
    check();
  }, [check]);

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [check]);

  // Automatic maintenance when space gets high (at most once every 6h)
  useEffect(() => {
    if (!health) return;
    const last = Number(localStorage.getItem("last_system_maintenance") || 0);
    const logs = health.cron_log_bytes + health.net_log_bytes;
    if (logs > 50 * 1024 * 1024 && Date.now() - last > 6 * 3600_000) runMaintenance(true);
  }, [health, runMaintenance]);

  const reconnect = async () => {
    const { error } = await supabase.auth.refreshSession();
    if (error) toast.error("Sessão expirada. Entre novamente.");
    else toast.success("Login renovado.");
    check();
  };

  const rows: { label: string; value: string; level: Level; hint: string }[] = health ? [
    { label: "Espaço usado no banco", value: `${mb(health.db_size_bytes)} de 500 MB`, level: levelOf(health.db_size_bytes / LIMIT_BYTES, 0.6, 0.85), hint: "Perto do limite o app fica lento ou não carrega." },
    { label: "Registros técnicos automáticos", value: mb(health.cron_log_bytes + health.net_log_bytes), level: levelOf(health.cron_log_bytes + health.net_log_bytes, 50 * 1024 * 1024, 150 * 1024 * 1024), hint: "Limpos todo dia de madrugada e pelo botão abaixo." },
    { label: "Conexões abertas", value: `${health.connections} de ${health.max_connections}`, level: levelOf(health.connections / health.max_connections, 0.7, 0.9), hint: "Muitas conexões impedem novos acessos e logins." },
    { label: "Velocidade de resposta", value: latency != null ? `${latency} ms` : "—", level: levelOf(latency ?? 0, 1500, 4000), hint: "Tempo para o banco responder agora." },
  ] : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-primary" />Saúde do Sistema</h2>
          <p className="text-sm text-muted-foreground">Verifica o banco a cada minuto e faz limpeza automática quando necessário. Nenhum dado de clientes, fichas, fotos, agenda ou caixa é apagado.</p>
        </div>
        <Button variant="outline" onClick={check} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />Verificar agora
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold flex items-center gap-2"><Database className="w-4 h-4 text-primary" />{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
            <div className="flex items-center gap-3"><span className="font-mono text-sm">{r.value}</span><Badge level={r.level} /></div>
            {r.label === "Espaço usado no banco" && health && (
              <div className="w-full basis-full space-y-2 pt-2">
                <Progress
                  value={Math.min(100, Math.max(0, health.db_size_bytes / LIMIT_BYTES * 100))}
                  aria-label="Uso do banco de dados"
                  aria-valuetext={`${mb(health.db_size_bytes)} de 500 MB`}
                  className={`h-3 ${r.level === "bad" ? "[&>div]:bg-destructive" : r.level === "warn" ? "[&>div]:bg-gold" : ""} [&>div]:motion-reduce:transition-none`}
                />
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>{(health.db_size_bytes / LIMIT_BYTES * 100).toFixed(1)}% usado</span>
                  <span>{mb(Math.max(0, LIMIT_BYTES - health.db_size_bytes))} livres</span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" />Login</p>
            <p className="text-xs text-muted-foreground">O login é renovado sozinho; use o botão se algo falhar.</p>
          </div>
          <div className="flex items-center gap-3">
            {authOk != null && <Badge level={authOk ? "ok" : "bad"} />}
            <Button size="sm" variant="outline" onClick={reconnect}>Renovar login</Button>
          </div>
        </div>
      </div>

      <Button onClick={() => runMaintenance(false)} disabled={fixing} className="gap-2 w-full sm:w-auto">
        <Wrench className="w-4 h-4" />{fixing ? "Fazendo manutenção..." : "Fazer manutenção agora"}
      </Button>
      {health && <p className="text-xs text-muted-foreground">Última verificação: {new Date(health.checked_at).toLocaleString("pt-BR")}</p>}
    </div>
  );
};

export default AdminSystemHealth;
