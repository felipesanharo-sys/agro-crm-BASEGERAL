import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from "recharts";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Target } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ForecastPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedRc, setSelectedRc] = useState<string>("consolidado");
  const [yearMonth, setYearMonth] = useState<string>("");
  const { toast } = useToast();
  const syncMutation = trpc.forecast.sync.useMutation();

  // Fetch consolidated data (admin only)
  const { data: consolidated, isLoading: consolidatedLoading } = trpc.forecast.consolidated.useQuery(
    { yearMonth: yearMonth || undefined },
    { enabled: isAdmin, staleTime: 300000 }
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

  const utils = trpc.useUtils();
  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast({
        title: "Sucesso",
        description: "Dados sincronizados com a planilha!",
      });
      await utils.forecast.consolidated.invalidate();
      await utils.forecast.allRcs.invalidate();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar dados",
        variant: "destructive",
      });
    }
  };

  // Dados consolidados para cards
  const totalBdg = useMemo(() => {
    if (!allRcs) return 0;
    return allRcs.reduce((sum: number, rc: any) => sum + (Number(rc.metaKg) || 0), 0);
  }, [allRcs]);

  const totalPrevisaoKg = useMemo(() => {
    if (!allRcs) return 0;
    return allRcs.reduce((sum: number, rc: any) => sum + (Number(rc.previsaoKg) || 0), 0);
  }, [allRcs]);

  const totalEmTelaKg = useMemo(() => {
    if (!allRcs) return 0;
    return allRcs.reduce((sum: number, rc: any) => sum + (Number(rc.emTelaKg) || 0), 0);
  }, [allRcs]);

  const totalFaturadoKg = useMemo(() => {
    if (!allRcs) return 0;
    return allRcs.reduce((sum: number, rc: any) => sum + (Number(rc.realizadoKg) || 0), 0);
  }, [allRcs]);

  const previsaoPercent = totalBdg > 0 ? Math.round((totalPrevisaoKg / totalBdg) * 100) : 0;
  const emTelaPercent = totalBdg > 0 ? Math.round((totalEmTelaKg / totalBdg) * 100) : 0;
  const faturadoPercent = totalBdg > 0 ? Math.round((totalFaturadoKg / totalBdg) * 100) : 0;

  // Gráfico "Faturado x BDG" - 3 barras por RC
  const chartData = useMemo(() => {
    if (!allRcs || allRcs.length === 0) return [];
    return allRcs.map((rc: any) => {
      // consumidorKg = previsao%, revendaKg = emTela%, industriaKg = faturado%
      const previsaoPct = Number(rc.consumidorKg) || 0;
      const emTelaPct = Number(rc.revendaKg) || 0;
      const faturadoPct = Number(rc.industriaKg) || 0;
      
      // Abreviar nome do RC
      const name = (rc.repName || rc.repCode || '').split(' ').slice(0, 2).join(' ');
      
      return {
        name,
        fullName: rc.repName,
        "Pedido na Tela %": emTelaPct,
        "Faturado %": faturadoPct,
        "Previsão %": previsaoPct,
      };
    });
  }, [allRcs]);

  // Calcular dias úteis restantes no mês
  const diasUteisRestantes = useMemo(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let count = 0;
    for (let d = new Date(today); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    }
    return count;
  }, []);

  // KG/dia necessário total
  const gapTotal = totalBdg - totalEmTelaKg;
  const kgDiaNecessario = diasUteisRestantes > 0 ? Math.round(gapTotal / diasUteisRestantes) : 0;

  // Formatador de números
  const formatKg = (val: number) => val.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Previsão de Vendas</h1>
        <div className="flex gap-3 items-center">
          {isAdmin && (
            <Select value={selectedRc} onValueChange={setSelectedRc}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                <SelectItem value="consolidado">Consolidado</SelectItem>
                {allRcs?.map((rc: any) => (
                  <SelectItem key={rc.repCode} value={rc.repCode}>
                    {rc.repName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <Button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards - Layout com borda colorida à esquerda */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BDG (META) */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">BDG (META)</p>
            <p className="text-2xl font-bold mt-1">{formatKg(totalBdg)} kg</p>
          </CardContent>
        </Card>

        {/* PREVISÃO FECHAMENTO */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PREVISÃO FECHAMENTO</p>
            <p className="text-2xl font-bold mt-1">
              <span className="text-yellow-600">{previsaoPercent}%</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">{formatKg(totalPrevisaoKg)} kg</span>
            </p>
          </CardContent>
        </Card>

        {/* PEDIDO NA TELA */}
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">PEDIDO NA TELA</p>
            <p className="text-2xl font-bold mt-1">
              <span className="text-blue-600">{emTelaPercent}%</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">{formatKg(totalEmTelaKg)} kg</span>
            </p>
          </CardContent>
        </Card>

        {/* FATURADO */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">FATURADO</p>
            <p className="text-2xl font-bold mt-1">
              <span className="text-red-600">{faturadoPercent}%</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">{formatKg(totalFaturadoKg)} kg</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Faturado x BDG */}
      <Card>
        <CardHeader>
          <CardTitle>Faturado x BDG</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`${value.toFixed(0)}%`, name]}
                labelFormatter={(label) => {
                  const item = chartData.find((d: any) => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey="Pedido na Tela %" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="Pedido na Tela %" position="top" formatter={(v: number) => v > 0 ? `${Math.round(v)}%` : ''} style={{ fontSize: 10 }} />
              </Bar>
              <Bar dataKey="Faturado %" fill="#ef4444" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="Faturado %" position="top" formatter={(v: number) => v > 0 ? `${Math.round(v)}%` : ''} style={{ fontSize: 10 }} />
              </Bar>
              <Bar dataKey="Previsão %" fill="#eab308" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="Previsão %" position="top" formatter={(v: number) => v > 0 ? `${Math.round(v)}%` : ''} style={{ fontSize: 10 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela Detalhamento por RC */}
      {allRcs && allRcs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por RC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">RC</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">BDG</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Prev.</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Ped.Tela</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Faturado</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Contato</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">Gap (kg)</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground">KG/dia</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allRcs.map((rc: any) => {
                    const metaKg = Number(rc.metaKg) || 0;
                    const previsaoKg = Number(rc.previsaoKg) || 0;
                    const emTelaKg = Number(rc.emTelaKg) || 0;
                    const faturadoKg = Number(rc.realizadoKg) || 0;
                    const contatoKg = Number(rc.contatoSemanalKg) || 0;
                    const necessidadeKg = Number(rc.necessidadeDiariaKg) || 0;
                    
                    // Percentuais armazenados nos campos reusados
                    const previsaoPct = Number(rc.consumidorKg) || 0;
                    const emTelaPct = Number(rc.revendaKg) || 0;
                    const faturadoPct = Number(rc.industriaKg) || 0;
                    
                    // GAP = Em Tela - BDG (negativo = falta para meta)
                    const gap = emTelaKg - metaKg;
                    
                    // KG/dia = GAP negativo / dias úteis restantes
                    const kgDia = diasUteisRestantes > 0 ? Math.round(Math.abs(gap) / diasUteisRestantes) : 0;
                    
                    // Cor da previsão
                    const previsaoColor = previsaoPct >= 100 ? "text-green-600" : previsaoPct >= 70 ? "text-yellow-600" : "text-red-600";
                    
                    return (
                      <tr key={rc.repCode} className="hover:bg-muted/50">
                        <td className="px-3 py-3">
                          <div className="font-medium">{rc.repName}</div>
                          <div className="text-xs text-muted-foreground">{rc.repCode}</div>
                        </td>
                        <td className="px-3 py-3 text-right font-medium">{formatKg(metaKg)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`font-bold ${previsaoColor}`}>{Math.round(previsaoPct)}%</span>
                          <span className="text-xs text-muted-foreground ml-1">{formatKg(previsaoKg)}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-blue-600">{Math.round(emTelaPct)}%</span>
                          <span className="text-xs text-muted-foreground ml-1">{formatKg(emTelaKg)}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-red-600">{Math.round(faturadoPct)}%</span>
                          <span className="text-xs text-muted-foreground ml-1">{formatKg(faturadoKg)}</span>
                        </td>
                        <td className="px-3 py-3 text-right">{formatKg(contatoKg)}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={gap < 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                            {gap < 0 ? `−${formatKg(Math.abs(gap))}` : formatKg(gap)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium">{formatKg(kgDia)}</td>
                        <td className="px-3 py-3 text-center">
                          <Target className={`h-4 w-4 mx-auto ${previsaoPct >= 100 ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </td>
                      </tr>
                    );
                  })}
                  {/* Linha TOTAL */}
                  <tr className="bg-muted/50 font-bold border-t-2">
                    <td className="px-3 py-3">TOTAL</td>
                    <td className="px-3 py-3 text-right">{formatKg(totalBdg)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-yellow-600">{previsaoPercent}%</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-blue-600">{emTelaPercent}%</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-red-600">{faturadoPercent}%</span>
                    </td>
                    <td className="px-3 py-3 text-right">-</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-red-600">−{formatKg(Math.abs(gapTotal))}</span>
                    </td>
                    <td className="px-3 py-3 text-right">{formatKg(kgDiaNecessario)}</td>
                    <td className="px-3 py-3 text-center">
                      <Target className="h-4 w-4 mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rodapé com dias úteis */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground"></span>
                <span>{diasUteisRestantes} dias úteis restantes no mês</span>
              </div>
              <div>
                Necessário: <span className="font-bold text-foreground">{formatKg(kgDiaNecessario)} kg/dia útil</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
