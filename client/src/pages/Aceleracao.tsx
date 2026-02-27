import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { RcSelector } from "@/components/RcSelector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

type AccCategory = "crescimento" | "estavel" | "queda" | "risco" | "inativo";

const CATEGORY_CONFIG: Record<AccCategory, { label: string; icon: any; color: string; bgColor: string }> = {
  crescimento: { label: "Em Crescimento", icon: TrendingUp, color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  estavel: { label: "Estável", icon: Minus, color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  queda: { label: "Em Queda", icon: TrendingDown, color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  risco: { label: "Em Risco", icon: AlertTriangle, color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" },
  inativo: { label: "Inativo", icon: Zap, color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
};

export default function Aceleracao() {
  const { user } = useAuth();
  const [selectedRc, setSelectedRc] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<AccCategory | "all">("all");

  const { data: rawData, isLoading } = trpc.acceleration.data.useQuery({ selectedRepCode: selectedRc });

  const analysis = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // Group by client
    const clientMap = new Map<string, {
      clientCodeSAP: string;
      clientName: string;
      repCode: string;
      repName: string;
      monthlyData: Map<string, { kg: number; revenue: number }>;
    }>();

    rawData.forEach((row) => {
      const key = `${row.clientCodeSAP}__${row.repCode}`;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientCodeSAP: row.clientCodeSAP || "",
          clientName: row.clientName,
          repCode: row.repCode,
          repName: row.repName,
          monthlyData: new Map(),
        });
      }
      const client = clientMap.get(key)!;
      client.monthlyData.set(row.yearMonth || "", {
        kg: parseFloat(String(row.totalKg || "0")),
        revenue: parseFloat(String(row.totalRevenue || "0")),
      });
    });

    // Analyze each client
    const now = new Date();
    const currentYM = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get all months sorted
    const allMonths = Array.from(new Set(rawData.map((r) => r.yearMonth).filter((m): m is string => !!m))).sort();
    const last3Months = allMonths.slice(-3);
    const prev3Months = allMonths.slice(-6, -3);

    return Array.from(clientMap.values()).map((client) => {
      const totalKg = Array.from(client.monthlyData.values()).reduce((s, v) => s + v.kg, 0);
      const totalRevenue = Array.from(client.monthlyData.values()).reduce((s, v) => s + v.revenue, 0);
      const monthsActive = client.monthlyData.size;

      // Calculate trend
      const recentKg = last3Months.reduce((s: number, m: string) => s + (client.monthlyData.get(m)?.kg || 0), 0);
      const prevKg = prev3Months.reduce((s: number, m: string) => s + (client.monthlyData.get(m)?.kg || 0), 0);

      let category: AccCategory;
      let trend = 0;
      if (prevKg > 0) {
        trend = ((recentKg - prevKg) / prevKg) * 100;
      }

      // Check if purchased in last 3 months
      const hasRecentPurchase = last3Months.some((m: string) => (client.monthlyData.get(m)?.kg || 0) > 0);

      if (!hasRecentPurchase && monthsActive > 0) {
        category = "inativo";
      } else if (trend > 15) {
        category = "crescimento";
      } else if (trend >= -15) {
        category = "estavel";
      } else if (trend >= -40) {
        category = "queda";
      } else {
        category = "risco";
      }

      return {
        ...client,
        totalKg,
        totalRevenue,
        monthsActive,
        recentKg,
        prevKg,
        trend,
        category,
      };
    });
  }, [rawData]);

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return analysis;
    return analysis.filter((c) => c.category === categoryFilter);
  }, [analysis, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    analysis.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [analysis]);

  // Sort by risk first, then by volume desc
  const sorted = useMemo(() => {
    const order: Record<string, number> = { inativo: 0, risco: 1, queda: 2, estavel: 3, crescimento: 4 };
    return [...filtered].sort((a, b) => {
      const orderDiff = (order[a.category] ?? 5) - (order[b.category] ?? 5);
      if (orderDiff !== 0) return orderDiff;
      return b.totalKg - a.totalKg;
    });
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Aceleração</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Identifique clientes em risco e oportunidades de reativação
            </p>
          </div>
          <RcSelector value={selectedRc} onChange={setSelectedRc} />
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.entries(CATEGORY_CONFIG) as [AccCategory, typeof CATEGORY_CONFIG[AccCategory]][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${categoryFilter === key ? "ring-2 ring-primary" : ""}`}
                onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)}
              >
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                  <p className="text-xl font-bold">{categoryCounts[key] || 0}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Client List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {categoryFilter === "all" ? "Todos os Clientes" : CATEGORY_CONFIG[categoryFilter].label}
              <span className="text-muted-foreground font-normal ml-2">({sorted.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium">RC</th>
                      <th className="text-right px-4 py-3 font-medium">Volume Total (KG)</th>
                      <th className="text-right px-4 py-3 font-medium">Últ. 3 Meses</th>
                      <th className="text-right px-4 py-3 font-medium">Ant. 3 Meses</th>
                      <th className="text-center px-4 py-3 font-medium">Tendência</th>
                      <th className="text-center px-4 py-3 font-medium">Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((c, i) => {
                      const cfg = CATEGORY_CONFIG[c.category];
                      const Icon = cfg.icon;
                      return (
                        <tr key={`${c.clientCodeSAP}-${c.repCode}-${i}`} className="border-b hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[200px]">{c.clientName}</div>
                            <div className="text-xs text-muted-foreground">{c.clientCodeSAP}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{c.repName || c.repCode}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatNumber(c.totalKg)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(c.recentKg)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(c.prevKg)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {c.trend > 0 ? (
                                <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
                              ) : c.trend < 0 ? (
                                <ArrowDown className="h-3.5 w-3.5 text-red-600" />
                              ) : (
                                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <span className={`text-xs font-medium ${c.trend > 0 ? "text-emerald-600" : c.trend < 0 ? "text-red-600" : ""}`}>
                                {c.trend !== 0 ? `${c.trend > 0 ? "+" : ""}${c.trend.toFixed(0)}%` : "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className={`${cfg.bgColor} ${cfg.color} text-xs`}>
                              <Icon className="h-3 w-3 mr-1" />
                              {cfg.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
