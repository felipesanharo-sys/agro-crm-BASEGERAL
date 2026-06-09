import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Search, ChevronUp, ChevronDown, ChevronsUpDown, Sparkles, RefreshCw, UserX } from "lucide-react";

const formatKg = (n: number) => {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}t`;
  return `${Math.round(n)}`;
};

const formatKgFull = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  em_ciclo: "Em Ciclo",
  alerta: "Alerta",
  pre_inativacao: "Pré-Inativ.",
  inativo: "Inativo",
  em_acao: "Em Ação",
  pedido_na_tela: "Ped. Tela",
  excluido: "Excluído",
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "text-[oklch(0.45_0.2_155)] bg-[oklch(0.93_0.06_155)]",
  em_ciclo: "text-[oklch(0.35_0.18_250)] bg-[oklch(0.92_0.05_250)]",
  alerta: "text-[oklch(0.5_0.18_55)] bg-[oklch(0.94_0.06_55)]",
  pre_inativacao: "text-[oklch(0.45_0.2_30)] bg-[oklch(0.93_0.06_30)]",
  inativo: "text-destructive bg-destructive/10",
  em_acao: "text-[oklch(0.4_0.18_280)] bg-[oklch(0.92_0.05_280)]",
  pedido_na_tela: "text-[oklch(0.35_0.2_155)] bg-[oklch(0.9_0.08_155)]",
  excluido: "text-muted-foreground bg-muted",
};

type SortKey = "variation" | "kg2026" | "kg2025" | "diffKg" | "clientName";
type VariationFilter = "all" | "growing" | "falling" | "new" | "recovered" | "absent";

interface Props {
  repOptions?: { repCode: string; repName: string }[];
  isAdmin: boolean;
}

export default function YtdRankingSection({ repOptions, isAdmin }: Props) {
  const [search, setSearch] = useState("");
  const [rcFilter, setRcFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("variation");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [variationFilter, setVariationFilter] = useState<VariationFilter>("all");

  const { data, isLoading } = trpc.clients.ytdRanking.useQuery(
    {
      repCode: isAdmin ? (rcFilter || undefined) : undefined,
      salesChannelGroup: channelFilter || undefined,
    },
    { staleTime: 120000 }
  );

  const today = new Date();
  // YTD = até o mês anterior completo
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth(), 0); // último dia do mês anterior
  const prevMonthName = prevMonthDate.toLocaleString("pt-BR", { month: "short" });
  const periodLabel = `Jan-${prevMonthName}`;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "clientName" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = [...data];

    if (variationFilter === "growing") rows = rows.filter(r => r.variation > 0 && r.kg2025 > 0 && !r.isAbsent);
    else if (variationFilter === "falling") rows = rows.filter(r => r.variation < 0 && !r.isAbsent);
    else if (variationFilter === "new") rows = rows.filter(r => r.isNewClient);
    else if (variationFilter === "recovered") rows = rows.filter(r => r.isRecovered);
    else if (variationFilter === "absent") rows = rows.filter(r => r.isAbsent);

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        r.clientCodeSAP.toLowerCase().includes(q)
      );
    }

    rows.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (sortKey === "clientName") {
        va = a.clientName.toLowerCase();
        vb = b.clientName.toLowerCase();
      } else {
        va = Number(a[sortKey]);
        vb = Number(b[sortKey]);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, variationFilter, search, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (!data) return { growing: 0, falling: 0, newClients: 0, recovered: 0, absent: 0, total: 0 };
    return {
      growing: data.filter(r => r.variation > 0 && r.kg2025 > 0 && !r.isAbsent).length,
      falling: data.filter(r => r.variation < 0 && !r.isAbsent).length,
      newClients: data.filter(r => r.isNewClient).length,
      recovered: data.filter(r => r.isRecovered).length,
      absent: data.filter(r => r.isAbsent).length,
      total: data.length,
    };
  }, [data]);

  // Breakdown por RC: agrupa todos os clientes por repAlias e calcula % de cada categoria
  const rcBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { alias: string; growing: number; falling: number; newC: number; recovered: number; absent: number; total: number }>();
    for (const r of data) {
      const key = r.repAlias || r.repCode;
      const short = key.split(' ').slice(0, 2).join(' ');
      if (!map.has(key)) map.set(key, { alias: short, growing: 0, falling: 0, newC: 0, recovered: 0, absent: 0, total: 0 });
      const entry = map.get(key)!;
      entry.total++;
      if (r.isNewClient) entry.newC++;
      else if (r.isRecovered) entry.recovered++;
      else if (r.isAbsent) entry.absent++;
      else if (r.variation > 0 && r.kg2025 > 0) entry.growing++;
      else if (r.variation < 0) entry.falling++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="h-3 w-3 ml-0.5 inline-block text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 ml-0.5 inline-block text-primary" />
      : <ChevronDown className="h-3 w-3 ml-0.5 inline-block text-primary" />;
  };

  const toggleFilter = (f: VariationFilter) =>
    setVariationFilter(prev => prev === f ? "all" : f);

  return (
    <div className="space-y-3">
      {/* Cards de resumo — 2x2 grid para caber os 4 cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Crescendo */}
        <button
          onClick={() => toggleFilter("growing")}
          className={`rounded-lg p-2.5 text-left transition-all border-2 ${variationFilter === "growing" ? "border-[oklch(0.65_0.2_155)] bg-[oklch(0.93_0.06_155)]" : "border-transparent bg-[oklch(0.95_0.03_155)]"}`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="h-3.5 w-3.5 text-[oklch(0.45_0.2_155)]" />
            <span className="text-[10px] font-semibold text-[oklch(0.45_0.2_155)] uppercase">Crescendo</span>
          </div>
          <p className="text-xl font-bold text-[oklch(0.45_0.2_155)]">{summary.growing}</p>
        </button>

        {/* Caindo */}
        <button
          onClick={() => toggleFilter("falling")}
          className={`rounded-lg p-2.5 text-left transition-all border-2 ${variationFilter === "falling" ? "border-destructive bg-destructive/10" : "border-transparent bg-destructive/5"}`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <span className="text-[10px] font-semibold text-destructive uppercase">Caindo</span>
          </div>
          <p className="text-xl font-bold text-destructive">{summary.falling}</p>
        </button>

        {/* Novo (nunca comprou antes de 2025) */}
        <button
          onClick={() => toggleFilter("new")}
          className={`rounded-lg p-2.5 text-left transition-all border-2 ${variationFilter === "new" ? "border-[oklch(0.5_0.18_280)] bg-[oklch(0.92_0.05_280)]" : "border-transparent bg-[oklch(0.95_0.02_280)]"}`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.4_0.18_280)]" />
            <span className="text-[10px] font-semibold text-[oklch(0.4_0.18_280)] uppercase">Novos</span>
          </div>
          <p className="text-xl font-bold text-[oklch(0.4_0.18_280)]">{summary.newClients}</p>
          <p className="text-[9px] text-[oklch(0.5_0.12_280)] leading-tight">Sem histórico anterior</p>
        </button>

        {/* Recuperado (tinha histórico, zerou em 2025, voltou em 2026) */}
        <button
          onClick={() => toggleFilter("recovered")}
          className={`rounded-lg p-2.5 text-left transition-all border-2 ${variationFilter === "recovered" ? "border-[oklch(0.5_0.18_55)] bg-[oklch(0.94_0.06_55)]" : "border-transparent bg-[oklch(0.96_0.03_55)]"}`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <RefreshCw className="h-3.5 w-3.5 text-[oklch(0.45_0.18_55)]" />
            <span className="text-[10px] font-semibold text-[oklch(0.45_0.18_55)] uppercase">Recuperados</span>
          </div>
          <p className="text-xl font-bold text-[oklch(0.45_0.18_55)]">{summary.recovered}</p>
          <p className="text-[9px] text-[oklch(0.55_0.1_55)] leading-tight">Voltaram em 2026</p>
        </button>

        {/* Ausentes — compraram em 2025 mas ainda não compraram em 2026 */}
        <button
          onClick={() => toggleFilter("absent")}
          className={`rounded-lg p-2.5 text-left transition-all border-2 col-span-2 ${variationFilter === "absent" ? "border-[oklch(0.5_0.15_20)] bg-[oklch(0.94_0.04_20)]" : "border-transparent bg-[oklch(0.96_0.02_20)]"}`}
        >
          <div className="flex items-center gap-1 mb-0.5">
            <UserX className="h-3.5 w-3.5 text-[oklch(0.45_0.15_20)]" />
            <span className="text-[10px] font-semibold text-[oklch(0.45_0.15_20)] uppercase">Ausentes</span>
          </div>
          <p className="text-xl font-bold text-[oklch(0.45_0.15_20)]">{summary.absent}</p>
          <p className="text-[9px] text-[oklch(0.55_0.1_20)] leading-tight">Compraram em 2025, ainda não em 2026</p>
        </button>
      </div>

      {/* Filtro por canal — acima do dashboard por RC */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { value: "", label: "Todos os canais" },
          { value: "Revenda/Cooperativa", label: "Revenda" },
          { value: "Consumidor/Outros", label: "Consumidor" },
          { value: "Indústria de Ração", label: "Indústria" },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setChannelFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all ${
              channelFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Dashboard por RC — visível apenas para admin e quando há mais de 1 RC */}
      {isAdmin && rcBreakdown.length > 1 && (
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Composição por RC</p>
            <div className="space-y-2">
              {rcBreakdown.map(rc => {
                const pGrow = rc.total > 0 ? (rc.growing / rc.total) * 100 : 0;
                const pFall = rc.total > 0 ? (rc.falling / rc.total) * 100 : 0;
                const pNew  = rc.total > 0 ? (rc.newC    / rc.total) * 100 : 0;
                const pRec  = rc.total > 0 ? (rc.recovered / rc.total) * 100 : 0;
                return (
                  <div key={rc.alias}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{rc.alias}</span>
                      <span className="text-[10px] text-muted-foreground">{rc.total} clientes</span>
                    </div>
                    {/* Barra empilhada */}
                    <div className="flex h-4 w-full rounded overflow-hidden gap-px">
                      {pGrow > 0 && (
                        <div
                          title={`Crescendo: ${rc.growing} (${pGrow.toFixed(0)}%)`}
                          style={{ width: `${pGrow}%` }}
                          className="bg-[oklch(0.65_0.2_155)] flex items-center justify-center"
                        >
                          {pGrow >= 8 && <span className="text-[9px] text-white font-bold">{pGrow.toFixed(0)}%</span>}
                        </div>
                      )}
                      {pFall > 0 && (
                        <div
                          title={`Caindo: ${rc.falling} (${pFall.toFixed(0)}%)`}
                          style={{ width: `${pFall}%` }}
                          className="bg-destructive flex items-center justify-center"
                        >
                          {pFall >= 8 && <span className="text-[9px] text-white font-bold">{pFall.toFixed(0)}%</span>}
                        </div>
                      )}
                      {pNew > 0 && (
                        <div
                          title={`Novos: ${rc.newC} (${pNew.toFixed(0)}%)`}
                          style={{ width: `${pNew}%` }}
                          className="bg-[oklch(0.6_0.18_280)] flex items-center justify-center"
                        >
                          {pNew >= 8 && <span className="text-[9px] text-white font-bold">{pNew.toFixed(0)}%</span>}
                        </div>
                      )}
                      {pRec > 0 && (
                        <div
                          title={`Recuperados: ${rc.recovered} (${pRec.toFixed(0)}%)`}
                          style={{ width: `${pRec}%` }}
                          className="bg-[oklch(0.65_0.18_55)] flex items-center justify-center"
                        >
                          {pRec >= 8 && <span className="text-[9px] text-white font-bold">{pRec.toFixed(0)}%</span>}
                        </div>
                      )}
                      {rc.absent > 0 && (() => { const pAbs = (rc.absent / rc.total) * 100; return (
                        <div
                          title={`Ausentes: ${rc.absent} (${pAbs.toFixed(0)}%)`}
                          style={{ width: `${pAbs}%` }}
                          className="bg-[oklch(0.7_0.12_20)] flex items-center justify-center"
                        >
                          {pAbs >= 8 && <span className="text-[9px] text-white font-bold">{pAbs.toFixed(0)}%</span>}
                        </div>
                      ); })()}
                      {/* Restante (sem variação / zerado) */}
                      {(100 - pGrow - pFall - pNew - pRec - ((rc.absent / rc.total) * 100)) > 0.5 && (
                        <div
                          style={{ width: `${100 - pGrow - pFall - pNew - pRec - ((rc.absent / rc.total) * 100)}%` }}
                          className="bg-muted"
                        />
                      )}
                    </div>
                    {/* Legenda numérica compacta */}
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {rc.growing > 0 && <span className="text-[9px] text-[oklch(0.45_0.2_155)]">↑{rc.growing}</span>}
                      {rc.falling > 0 && <span className="text-[9px] text-destructive">↓{rc.falling}</span>}
                      {rc.newC > 0 && <span className="text-[9px] text-[oklch(0.4_0.18_280)]">✦{rc.newC}</span>}
                      {rc.recovered > 0 && <span className="text-[9px] text-[oklch(0.45_0.18_55)]">↺{rc.recovered}</span>}
                      {rc.absent > 0 && <span className="text-[9px] text-[oklch(0.45_0.15_20)]">✕{rc.absent}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legenda das cores */}
            <div className="flex gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.65_0.2_155)]" />
                <span className="text-[10px] text-muted-foreground">Crescendo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                <span className="text-[10px] text-muted-foreground">Caindo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.6_0.18_280)]" />
                <span className="text-[10px] text-muted-foreground">Novos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.65_0.18_55)]" />
                <span className="text-[10px] text-muted-foreground">Recuperados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-[oklch(0.7_0.12_20)]" />
                <span className="text-[10px] text-muted-foreground">Ausentes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        {isAdmin && repOptions && repOptions.length > 0 && (
          <Select value={rcFilter || "all"} onValueChange={v => setRcFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="Todos os RCs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os RCs</SelectItem>
              {repOptions.map(r => (
                <SelectItem key={r.repCode} value={r.repCode}>{r.repName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filtered.length} cliente(s) · YTD {periodLabel} · Toque no cabeçalho para ordenar
      </p>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    className="text-left py-2.5 px-3 font-semibold sticky left-0 bg-muted/50 z-10 cursor-pointer min-w-[130px] select-none"
                    onClick={() => handleSort("clientName")}
                  >
                    Cliente <SortIcon k="clientName" />
                  </th>
                  {isAdmin && (
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">RC</th>
                  )}
                  <th
                    className="text-center py-2 px-2 font-semibold whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("variation")}
                  >
                    Var. % <SortIcon k="variation" />
                  </th>
                  <th
                    className="text-right py-2 px-2 font-semibold whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("kg2026")}
                  >
                    2026 <SortIcon k="kg2026" />
                  </th>
                  <th
                    className="text-right py-2 px-2 font-semibold whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("kg2025")}
                  >
                    2025 <SortIcon k="kg2025" />
                  </th>
                  <th
                    className="text-right py-2 px-2 font-semibold whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("diffKg")}
                  >
                    Dif. <SortIcon k="diffKg" />
                  </th>
                  <th className="text-center py-2 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Linha de totais — primeira linha */}
                {filtered.length > 0 && (() => {
                  const totalKg2026 = filtered.reduce((s, r) => s + r.kg2026, 0);
                  const totalKg2025 = filtered.reduce((s, r) => s + r.kg2025, 0);
                  const totalDiff = totalKg2026 - totalKg2025;
                  const totalVar = totalKg2025 > 0 ? ((totalKg2026 - totalKg2025) / totalKg2025) * 100 : 0;
                  return (
                    <tr className="border-b-2 bg-muted/50 font-semibold">
                      <td className="py-2.5 px-3 sticky left-0 bg-muted/50 z-10 text-xs">
                        TOTAL
                        <div className="text-[10px] font-normal text-muted-foreground">{filtered.length} clientes</div>
                      </td>
                      {isAdmin && <td />}
                      <td className={`py-2.5 px-2 text-center text-xs font-bold ${
                        totalVar > 0 ? "text-[oklch(0.45_0.2_155)]" : totalVar < 0 ? "text-destructive" : "text-muted-foreground"
                      }`}>
                        {totalVar > 0 ? "+" : ""}{totalVar.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs" title={`${formatKgFull(totalKg2026)} kg`}>
                        {formatKg(totalKg2026)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-muted-foreground" title={`${formatKgFull(totalKg2025)} kg`}>
                        {formatKg(totalKg2025)}
                      </td>
                      <td className={`py-2.5 px-2 text-right text-xs ${
                        totalDiff > 0 ? "text-[oklch(0.45_0.2_155)]" : totalDiff < 0 ? "text-destructive" : "text-muted-foreground"
                      }`} title={`${formatKgFull(Math.abs(totalDiff))} kg`}>
                        {totalDiff > 0 ? "+" : ""}{formatKg(totalDiff)}
                      </td>
                      <td />
                    </tr>
                  );
                })()}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
                {filtered.map((row, i) => {
                  const isAbsent = row.isAbsent;
                  const isGrowth = !isAbsent && row.variation > 0 && row.kg2025 > 0;
                  const isFalling = !isAbsent && row.variation < 0;
                  const isNew = row.isNewClient;
                  const isRecov = row.isRecovered;

                  const variationColor = isNew || isRecov
                    ? isNew ? "text-[oklch(0.4_0.18_280)]" : "text-[oklch(0.45_0.18_55)]"
                    : isAbsent
                    ? "text-[oklch(0.45_0.15_20)]"
                    : isGrowth
                    ? "text-[oklch(0.45_0.2_155)]"
                    : isFalling
                    ? "text-destructive"
                    : "text-muted-foreground";

                  const rowBg = i % 2 === 0 ? "bg-background" : "bg-muted/20";

                  return (
                    <tr key={row.clientCodeSAP} className={`border-b last:border-0 ${rowBg} hover:bg-muted/30 transition-colors`}>
                      {/* Nome do cliente — sticky */}
                      <td className={`py-2 px-3 sticky left-0 z-10 ${rowBg}`}>
                        <div className="font-medium leading-tight max-w-[130px] truncate" title={row.clientName}>
                          {row.clientName}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{row.clientCodeSAP}</div>
                      </td>

                      {/* RC (admin) */}
                      {isAdmin && (
                        <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                          {row.repAlias?.split(" ").slice(0, 2).join(" ")}
                        </td>
                      )}

                      {/* Variação % */}
                      <td className={`py-2 px-2 text-center font-bold ${variationColor}`}>
                        <div className="flex items-center justify-center gap-0.5">
                          {isNew ? (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span className="text-[10px] font-semibold">NOVO</span>
                            </>
                          ) : isRecov ? (
                            <>
                              <RefreshCw className="h-3 w-3" />
                              <span className="text-[10px] font-semibold">RECUP.</span>
                            </>
                          ) : isAbsent ? (
                            <>
                              <UserX className="h-3 w-3" />
                              <span className="text-[10px] font-semibold">AUSENTE</span>
                            </>
                          ) : isGrowth ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>+{row.variation.toFixed(1)}%</span>
                            </>
                          ) : isFalling ? (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              <span>{row.variation.toFixed(1)}%</span>
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3" />
                              <span>0%</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* KG 2026 */}
                      <td className="py-2 px-2 text-right font-semibold">
                        <span title={`${formatKgFull(row.kg2026)} kg`}>{formatKg(row.kg2026)}</span>
                      </td>

                      {/* KG 2025 */}
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        <span title={`${formatKgFull(row.kg2025)} kg`}>{formatKg(row.kg2025)}</span>
                      </td>

                      {/* Diferença */}
                      <td className={`py-2 px-2 text-right font-medium ${row.diffKg > 0 ? "text-[oklch(0.45_0.2_155)]" : row.diffKg < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        <span title={`${formatKgFull(Math.abs(row.diffKg))} kg`}>
                          {row.diffKg > 0 ? "+" : ""}{formatKg(row.diffKg)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
