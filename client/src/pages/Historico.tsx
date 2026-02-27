import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { RcSelector } from "@/components/RcSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const COLORS = [
  "oklch(0.55 0.15 150)", "oklch(0.65 0.12 170)", "oklch(0.50 0.10 200)",
  "oklch(0.70 0.14 80)", "oklch(0.60 0.18 30)", "oklch(0.55 0.12 260)",
  "oklch(0.65 0.15 320)", "oklch(0.50 0.14 100)", "oklch(0.70 0.10 220)",
  "oklch(0.60 0.12 50)",
];

export default function Historico() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const [selectedRc, setSelectedRc] = useState<string | undefined>();

  const { data: evolution } = trpc.history.evolution.useQuery({ selectedRepCode: selectedRc, months: 12 });
  const { data: topClients } = trpc.history.topClients.useQuery({ selectedRepCode: selectedRc });
  const { data: topProducts } = trpc.history.topProducts.useQuery({ selectedRepCode: selectedRc });
  const { data: rcRanking } = trpc.history.rcRanking.useQuery(undefined, { enabled: isAdmin });

  const chartData = (evolution || []).map((e) => ({
    month: String(e.yearMonth || "").replace(".", "/"),
    kg: parseFloat(String(e.totalKg || "0")),
    revenue: parseFloat(String(e.totalRevenue || "0")),
    clients: parseInt(String(e.clientCount || "0")),
  }));

  const clientsData = (topClients || []).map((c) => ({
    name: c.clientName.length > 25 ? c.clientName.slice(0, 25) + "..." : c.clientName,
    kg: parseFloat(String(c.totalKg || "0")),
    revenue: parseFloat(String(c.totalRevenue || "0")),
  }));

  const productsData = (topProducts || []).map((p) => ({
    name: p.productName.length > 25 ? p.productName.slice(0, 25) + "..." : p.productName,
    kg: parseFloat(String(p.totalKg || "0")),
    revenue: parseFloat(String(p.totalRevenue || "0")),
    clients: parseInt(String(p.clientCount || "0")),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Evolução de vendas, ranking de clientes e produtos
            </p>
          </div>
          <RcSelector value={selectedRc} onChange={setSelectedRc} />
        </div>

        <Tabs defaultValue="evolution" className="space-y-4">
          <TabsList>
            <TabsTrigger value="evolution">Evolução</TabsTrigger>
            <TabsTrigger value="clients">Top Clientes</TabsTrigger>
            <TabsTrigger value="products">Top Produtos</TabsTrigger>
            {isAdmin && <TabsTrigger value="ranking">Ranking RCs</TabsTrigger>}
          </TabsList>

          <TabsContent value="evolution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume Mensal (KG)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={formatNumber} />
                      <Tooltip
                        formatter={(value: number) => [`${formatNumber(value)} kg`, "Volume"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      />
                      <Line type="monotone" dataKey="kg" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" tickFormatter={formatCurrency} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Receita"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      />
                      <Bar dataKey="revenue" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Clientes por Volume (KG)</CardTitle>
              </CardHeader>
              <CardContent>
                {clientsData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={clientsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={formatNumber} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={180} />
                      <Tooltip
                        formatter={(value: number) => [`${formatNumber(value)} kg`, "Volume"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      />
                      <Bar dataKey="kg" radius={[0, 4, 4, 0]}>
                        {clientsData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 10 Produtos por Volume (KG)</CardTitle>
              </CardHeader>
              <CardContent>
                {productsData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={formatNumber} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={180} />
                      <Tooltip
                        formatter={(value: number) => [`${formatNumber(value)} kg`, "Volume"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      />
                      <Bar dataKey="kg" radius={[0, 4, 4, 0]}>
                        {productsData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="ranking">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ranking de Representantes Comerciais</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-4 py-3 font-medium">#</th>
                          <th className="text-left px-4 py-3 font-medium">RC</th>
                          <th className="text-right px-4 py-3 font-medium">Volume (KG)</th>
                          <th className="text-right px-4 py-3 font-medium">Receita</th>
                          <th className="text-right px-4 py-3 font-medium">Clientes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rcRanking || []).map((rc, i) => (
                          <tr key={rc.repCode} className="border-b">
                            <td className="px-4 py-3 font-medium">{i + 1}</td>
                            <td className="px-4 py-3">{rc.repName || rc.repCode}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(parseFloat(String(rc.totalKg || "0")))}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(parseFloat(String(rc.totalRevenue || "0")))}</td>
                            <td className="px-4 py-3 text-right">{rc.clientCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
