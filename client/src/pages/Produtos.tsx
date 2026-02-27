import DashboardLayout from "@/components/DashboardLayout";
import { RcSelector } from "@/components/RcSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export default function Produtos() {
  const [selectedRc, setSelectedRc] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const { data: products, isLoading } = trpc.products.list.useQuery({ selectedRepCode: selectedRc });
  const { data: evolution } = trpc.products.evolution.useQuery(
    { productName: selectedProduct!, selectedRepCode: selectedRc },
    { enabled: !!selectedProduct }
  );
  const { data: productClients } = trpc.products.clients.useQuery(
    { productName: selectedProduct!, selectedRepCode: selectedRc },
    { enabled: !!selectedProduct }
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    return products.filter((p) =>
      p.productName.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const totalKg = useMemo(() => {
    if (!products) return 0;
    return products.reduce((s, p) => s + parseFloat(String(p.totalKg || "0")), 0);
  }, [products]);

  const evolutionChart = (evolution || []).map((e) => ({
    month: String(e.yearMonth || "").replace(".", "/"),
    kg: parseFloat(String(e.totalKg || "0")),
    revenue: parseFloat(String(e.totalRevenue || "0")),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Análise de volume por produto e evolução temporal
            </p>
          </div>
          <RcSelector value={selectedRc} onChange={setSelectedRc} />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-primary" />
                <p className="text-xs text-muted-foreground">Total de Produtos</p>
              </div>
              <p className="text-2xl font-bold">{products?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Volume Total (KG)</p>
              <p className="text-2xl font-bold">{formatNumber(totalKg)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Resultados</p>
              <p className="text-2xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Product List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum produto encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Produto</th>
                      <th className="text-right px-4 py-3 font-medium">Volume (KG)</th>
                      <th className="text-right px-4 py-3 font-medium">Receita</th>
                      <th className="text-right px-4 py-3 font-medium">Clientes</th>
                      <th className="text-right px-4 py-3 font-medium">% Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const kg = parseFloat(String(p.totalKg || "0"));
                      const rev = parseFloat(String(p.totalRevenue || "0"));
                      const clients = parseInt(String(p.clientCount || "0"));
                      const pct = totalKg > 0 ? (kg / totalKg) * 100 : 0;
                      return (
                        <tr
                          key={`${p.productName}-${i}`}
                          className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                          onClick={() => setSelectedProduct(p.productName)}
                        >
                          <td className="px-4 py-3 font-medium">{p.productName}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(kg)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(rev)}</td>
                          <td className="px-4 py-3 text-right">{clients}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
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

        {/* Product Detail Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Evolution Chart */}
              <div>
                <h3 className="text-sm font-medium mb-3">Evolução Mensal (KG)</h3>
                {evolutionChart.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados de evolução
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={evolutionChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={formatNumber} />
                      <Tooltip
                        formatter={(value: number) => [`${formatNumber(value)} kg`, "Volume"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      />
                      <Bar dataKey="kg" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Clients that buy this product */}
              <div>
                <h3 className="text-sm font-medium mb-3">Clientes</h3>
                {!productClients || productClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-3 py-2 font-medium">Cliente</th>
                          <th className="text-right px-3 py-2 font-medium">Volume (KG)</th>
                          <th className="text-right px-3 py-2 font-medium">Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productClients.map((c, i) => (
                          <tr key={`${c.clientCodeSAP}-${i}`} className="border-b">
                            <td className="px-3 py-2">{c.clientName}</td>
                            <td className="px-3 py-2 text-right">
                              {formatNumber(parseFloat(String(c.totalKg || "0")))}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(parseFloat(String(c.totalRevenue || "0")))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
