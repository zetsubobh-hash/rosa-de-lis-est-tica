import { useState, useRef } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X, Search, UserPlus, Copy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ParsedRow = {
  full_name: string;
  phone: string;
  birth_date: string;
  email: string;
  address: string;
};

const HEADER_ALIASES: Record<keyof ParsedRow, string[]> = {
  full_name: ["nome", "nome completo", "cliente", "full_name", "name", "nome do cliente"],
  phone: ["telefone", "celular", "fone", "whatsapp", "phone", "contato", "tel"],
  birth_date: ["nascimento", "data de nascimento", "aniversario", "aniversário", "birth_date", "data nascimento", "dt nascimento"],
  email: ["email", "e-mail", "mail"],
  address: ["endereco", "endereço", "address", "rua"],
};

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const excelDateToISO = (serial: number) => {
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

type PreviewSample = { row: number; full_name: string; phone: string; status: string; reason: string };
type PreviewResult = { total: number; novos: number; duplicados: number; invalidos: number; samples: PreviewSample[] };

const AdminClientImportExport = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!raw.length) {
        toast.error("Planilha vazia ou sem cabeçalho.");
        return;
      }

      const headers = Object.keys(raw[0]);
      const map: Partial<Record<keyof ParsedRow, string>> = {};
      (Object.keys(HEADER_ALIASES) as (keyof ParsedRow)[]).forEach((field) => {
        const found = headers.find((h) => HEADER_ALIASES[field].includes(norm(h)));
        if (found) map[field] = found;
      });

      if (!map.full_name) {
        toast.error("Não encontrei a coluna de nome. Use um cabeçalho 'Nome'.");
        return;
      }

      const parsed: ParsedRow[] = raw
        .map((r) => {
          const birthRaw = map.birth_date ? r[map.birth_date] : "";
          const birth = typeof birthRaw === "number" ? excelDateToISO(birthRaw) : String(birthRaw ?? "").trim();
          return {
            full_name: String(r[map.full_name!] ?? "").trim(),
            phone: map.phone ? String(r[map.phone] ?? "").trim() : "",
            birth_date: birth,
            email: map.email ? String(r[map.email] ?? "").trim() : "",
            address: map.address ? String(r[map.address] ?? "").trim() : "",
          };
        })
        .filter((r) => r.full_name);

      setRows(parsed);
      setFileName(file.name);
      setPreview(null);
      setResult(null);
      toast.success(`${parsed.length} registros lidos de ${file.name}`);
    } catch (e: any) {
      toast.error("Não foi possível ler o arquivo: " + (e?.message || "formato inválido"));
    }
  };

  const runAnalyze = async () => {
    if (!rows.length) return;
    setAnalyzing(true);
    setPreview(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-clients", {
        body: { rows, dryRun: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreview({
        total: (data as any).total ?? rows.length,
        novos: (data as any).novos ?? 0,
        duplicados: (data as any).duplicados ?? 0,
        invalidos: (data as any).invalidos ?? 0,
        samples: (data as any).samples ?? [],
      });
    } catch (e: any) {
      toast.error("Erro ao analisar: " + (e?.message || "tente novamente"));
    } finally {
      setAnalyzing(false);
    }
  };

  const runImport = async () => {
    if (!rows.length || !preview) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    const BATCH = 50;

    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke("import-clients", {
          body: { rows: chunk },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        created += (data as any)?.created ?? 0;
        skipped += (data as any)?.skipped ?? 0;
        if ((data as any)?.errors?.length) errors.push(...(data as any).errors);
        setProgress(Math.min(100, Math.round(((i + chunk.length) / rows.length) * 100)));
      }
      setResult({ created, skipped, errors });
      setPreview(null);
      toast.success(`${created} clientes importados · ${skipped} ignorados`);
    } catch (e: any) {
      toast.error("Erro na importação: " + (e?.message || "tente novamente"));
    } finally {
      setImporting(false);
    }
  };

  const runExport = async (format: "xlsx" | "csv") => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, phone, email, birth_date, address, created_at")
        .order("full_name", { ascending: true })
        .limit(20000);
      if (error) throw error;

      const out = (data || []).map((p: any) => ({
        Nome: p.full_name || "",
        Usuario: p.username || "",
        Telefone: p.phone || "",
        Email: p.email || "",
        Nascimento: p.birth_date || "",
        Endereco: p.address || "",
        Cadastro: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "",
      }));

      const ws = XLSX.utils.json_to_sheet(out);
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `clientes-${stamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        XLSX.writeFile(wb, `clientes-${stamp}.xlsx`);
      }
      toast.success(`${out.length} clientes exportados`);
    } catch (e: any) {
      toast.error("Erro ao exportar: " + (e?.message || ""));
    } finally {
      setExporting(false);
    }
  };

  const downloadModel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nome: "Maria da Silva", Telefone: "(31) 99999-9999", Nascimento: "15/04/1990", Email: "", Endereco: "" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo-importacao-clientes.xlsx");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Import */}
        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-base md:text-lg font-bold text-foreground">Importar clientes</h3>
              <p className="font-body text-xs text-muted-foreground">Planilha .xlsx, .xls ou .csv — duplicados são ignorados</p>
            </div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/40 transition-colors"
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-body text-sm text-foreground font-medium">
              {fileName || "Clique ou arraste a planilha aqui"}
            </p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Colunas aceitas: Nome, Telefone, Nascimento, Email, Endereço
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-sm text-foreground">
                  <strong>{rows.length}</strong> registros prontos para importar
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRows([]);
                    setFileName("");
                    setPreview(null);
                    setResult(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="max-h-52 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs font-body">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-semibold">Nome</th>
                      <th className="text-left p-2 font-semibold">Telefone</th>
                      <th className="text-left p-2 font-semibold">Nascimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 truncate max-w-[180px]">{r.full_name}</td>
                        <td className="p-2 whitespace-nowrap">{r.phone || "—"}</td>
                        <td className="p-2 whitespace-nowrap">{r.birth_date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importing && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}

              {!preview && (
                <Button onClick={runAnalyze} disabled={analyzing || importing} className="w-full">
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analisando…
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Analisar planilha (prévia)
                    </>
                  )}
                </Button>
              )}

              {preview && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <UserPlus className="w-4 h-4 mx-auto text-primary mb-1" />
                      <p className="font-heading text-lg font-bold text-foreground">{preview.novos}</p>
                      <p className="font-body text-[11px] text-muted-foreground">Novos</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <Copy className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="font-heading text-lg font-bold text-foreground">{preview.duplicados}</p>
                      <p className="font-body text-[11px] text-muted-foreground">Duplicados</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <Ban className="w-4 h-4 mx-auto text-destructive mb-1" />
                      <p className="font-heading text-lg font-bold text-foreground">{preview.invalidos}</p>
                      <p className="font-body text-[11px] text-muted-foreground">Inválidos</p>
                    </div>
                  </div>

                  {preview.samples.length > 0 && (
                    <div className="max-h-44 overflow-auto rounded-lg border border-border">
                      <table className="w-full text-xs font-body">
                        <thead className="bg-muted/60 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-semibold">Linha</th>
                            <th className="text-left p-2 font-semibold">Nome</th>
                            <th className="text-left p-2 font-semibold">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.samples.map((s, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="p-2 whitespace-nowrap">{s.row}</td>
                              <td className="p-2 truncate max-w-[150px]">{s.full_name}</td>
                              <td className={`p-2 ${s.status === "invalido" ? "text-destructive" : "text-muted-foreground"}`}>{s.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="font-body text-xs text-muted-foreground">
                    Serão importados apenas os <strong>{preview.novos}</strong> registros novos. Duplicados e inválidos são ignorados.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={runImport} disabled={importing || preview.novos === 0} className="flex-1">
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Importando… {progress}%
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Confirmar importação ({preview.novos})
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setPreview(null)} disabled={importing} className="flex-1">
                      Refazer análise
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center gap-2 font-body text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>
                  <strong>{result.created}</strong> cadastrados · <strong>{result.skipped}</strong> ignorados (duplicados)
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-start gap-2 font-body text-xs text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {result.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={downloadModel} className="w-full">
            <Download className="w-4 h-4" /> Baixar planilha modelo
          </Button>
        </Card>

        {/* Export */}
        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-base md:text-lg font-bold text-foreground">Exportar clientes</h3>
              <p className="font-body text-xs text-muted-foreground">Baixe a base completa de clientes cadastrados</p>
            </div>
          </div>

          <p className="font-body text-sm text-muted-foreground">
            O arquivo inclui nome, usuário, telefone, e-mail, data de nascimento, endereço e data de cadastro.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => runExport("xlsx")} disabled={exporting} className="flex-1">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Exportar Excel
            </Button>
            <Button variant="outline" onClick={() => runExport("csv")} disabled={exporting} className="flex-1">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminClientImportExport;
