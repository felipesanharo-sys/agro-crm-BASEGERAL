import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { trpc } from "@/lib/trpc";
import { TrendingUp, Target, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForecastPage() {
  const [selectedRc, setSelectedRc] = useState<string>("consolidado");
  const [yearMonth, setYearMonth] = useState<string>("");

  // Fetch consolidated data
  const { data: consolidated, isLoading: consolidatedLoading } = trpc.forecast.consolidated.useQuery(
    { yearMonth: yearMonth || undefined },
    { staleTime: 300000 }
  );

  // Fetch all RCs data
  const { data: allRcs, isLoading: allRcsLoading } = trpc.forecast.allRcs.useQuery(
    { yearMonth: yearMonth || undefined },
    { staleTime: 300000 }
  );

  // Fetch specific RC data
  const { data: rcData } = trpc.forecast.byRc.useQuery(
    { repCode: selectedRc, yearMonth: yearMonth || undefined },
    { enabled: selectedRc !== "consolidado", staleTime: 300000 }
  );

  const currentData = selectedRc === "consolidado" ? consolidated : rcData;
  const isLoading = selectedRc === "consolidado" ? consolidatedLoading : false;

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!allRcs || allRcs.length === 0) return [];
    return allRcs.map((rc: any) => ({
      name: rc.repName?.substring(0, 15) || rc.repCode,
      meta: Number(rc.metaKg) || 0,
      previsao: Number(rc.previsaoKg) || 0,
      realizado: Number(rc.realizadoKg) || 0,
      emTela: Number(rc.emTelaKg) || 0,
    }));
  }, [allRcs]);

  // Calculate percentages
  const percentualAtingimento = currentData && Number(currentData.metaKg) > 0
    ? ((Number(currentData.realizadoKg) / Number(currentData.metaKg)) * 100).toFixed(1)
    : "0.0";

  const percentualPrevisao = currentData && Number(currentData.metaKg) > 0
    ? ((Number(currentData.previsaoKg) / Number(currentData.metaKg)) * 100).toFixed(1)
    : "0.0";

  const percentualEmTela = currentData && Number(currentData.metaKg) > 0
    ? ((Number(currentData.emTelaKg) / Number(currentData.metaKg)) * 100).toFixed(1)
    : "0.0";

  const gap = currentData
    ? Number(currentData.metaKg) - Number(currentData.emTelaKg)
    : 0;

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Previsão de Vendas</h1>
        <div className="flex gap-3">
          <Select value={selectedRc} onValueChange={setSelectedRc}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consolidado">Consolidado</SelectItem>
              {allRcs?.map((rc: any) => (
                <SelectItem key={rc.repCode} value={rc.repCode}>
                  {rc.repName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      {!isLoading && currentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Meta */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Meta (BDG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(currentData.metaKg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div>
            </CardContent>
          </Card>

          {/* Previsão */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Previsão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(currentData.previsaoKg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div>
              <p className="text-xs text-muted-foreground mt-1">{percentualPrevisao}% da meta</p>
            </CardContent>
          </Card>

          {/* Realizado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Realizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(currentData.realizadoKg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div>
              <p className="text-xs text-muted-foreground mt-1">{percentualAtingimento}% da meta</p>
            </CardContent>
          </Card>

          {/* GAP */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                GAP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gap.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg</div>
              <p className="text-xs text-muted-foreground mt-1">Falta para meta</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meta vs Previsão vs Realizado */}
        <Card>
          <CardHeader>
            <CardTitle>Meta vs Previsão vs Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${(value as number).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`} />
                <Legend />
                <Bar dataKey="meta" fill="#10b981" name="Meta" />
                <Bar dataKey="previsao" fill="#f59e0b" name="Previsão" />
                <Bar dataKey="realizado" fill="#3b82f6" name="Realizado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pedido em Tela */}
        <Card>
          <CardHeader>
            <CardTitle>Pedido em Tela vs Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${(value as number).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg`} />
                <Legend />
                <Bar dataKey="meta" fill="#10b981" name="Meta" />
                <Bar dataKey="emTela" fill="#8b5cf6" name="Em Tela" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de RCs */}
      {selectedRc === "consolidado" && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por RC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">RC</th>
                    <th className="px-4 py-2 text-right font-semibold">Meta (kg)</th>
                    <th className="px-4 py-2 text-right font-semibold">Previsão (kg)</th>
                    <th className="px-4 py-2 text-right font-semibold">Realizado (kg)</th>
                    <th className="px-4 py-2 text-right font-semibold">% Atingimento</th>
                    <th className="px-4 py-2 text-right font-semibold">GAP (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allRcs?.map((rc: any) => {
                    const meta = Number(rc.metaKg) || 0;
                    const previsao = Number(rc.previsaoKg) || 0;
                    const realizado = Number(rc.realizadoKg) || 0;
                    const atingimento = meta > 0 ? ((realizado / meta) * 100).toFixed(1) : "0.0";
                    const gap = meta - realizado;
                    return (
                      <tr key={rc.repCode} className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-medium">{rc.repName}</td>
                        <td className="px-4 py-2 text-right">{meta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2 text-right">{previsao.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2 text-right">{realizado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={atingimento >= "100" ? "text-green-600 font-semibold" : atingimento >= "80" ? "text-yellow-600" : "text-red-600"}>
                            {atingimento}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{gap.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
