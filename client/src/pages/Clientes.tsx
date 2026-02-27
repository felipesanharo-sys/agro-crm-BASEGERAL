import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { RcSelector } from "@/components/RcSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Eye, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  em_ciclo: { label: "Em Ciclo", color: "bg-blue-100 text-blue-800 border-blue-200" },
  alerta: { label: "Alerta", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pre_inativacao: { label: "Pré-Inativação", color: "bg-orange-100 text-orange-800 border-orange-200" },
  inativo: { label: "Inativo", color: "bg-red-100 text-red-800 border-red-200" },
  em_acao: { label: "Em Ação", color: "bg-purple-100 text-purple-800 border-purple-200" },
  pedido_na_tela: { label: "Pedido na Tela", color: "bg-teal-100 text-teal-800 border-teal-200" },
  excluido: { label: "Excluído", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <Badge variant="outline" className={`${cfg.color} text-xs font-medium`}>
      {cfg.label}
    </Badge>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function Clientes() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";
  const [selectedRc, setSelectedRc] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [actionType, setActionType] = useState<string>("");
  const [actionNote, setActionNote] = useState("");

  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery({ selectedRepCode: selectedRc });

  const setActionMutation = trpc.clients.setAction.useMutation({
    onSuccess: () => {
      toast.success("Ação registrada com sucesso!");
      utils.clients.list.invalidate();
      setSelectedClient(null);
      setActionType("");
      setActionNote("");
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => {
      const matchSearch =
        !search ||
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        (c.clientCodeSAP || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.effectiveStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const statusCounts = useMemo(() => {
    if (!clients) return {};
    const counts: Record<string, number> = {};
    clients.forEach((c) => {
      counts[c.effectiveStatus] = (counts[c.effectiveStatus] || 0) + 1;
    });
    return counts;
  }, [clients]);

  // Health score
  const healthScore = useMemo(() => {
    if (!clients || clients.length === 0) return 0;
    const healthy = clients.filter(
      (c) => c.effectiveStatus === "ativo" || c.effectiveStatus === "em_acao" || c.effectiveStatus === "pedido_na_tela"
    ).length;
    return Math.round((healthy / clients.length) * 100);
  }, [clients]);

  const handleAction = () => {
    if (!selectedClient || !actionType) return;
    setActionMutation.mutate({
      clientCodeSAP: selectedClient.clientCodeSAP,
      repCode: selectedClient.repCode,
      actionType: actionType as any,
      note: actionNote || undefined,
      previousStatus: selectedClient.effectiveStatus,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Carteira de clientes com ciclo de compra e status
            </p>
          </div>
          <RcSelector value={selectedRc} onChange={setSelectedRc} />
        </div>

        {/* Health Score */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Saúde da Carteira</p>
              <p className="text-2xl font-bold text-primary">{healthScore}%</p>
            </CardContent>
          </Card>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${statusFilter === key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-xs text-muted-foreground mb-1">{cfg.label}</p>
                <p className="text-lg font-bold">{statusCounts[key] || 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código SAP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Cliente</th>
                      <th className="text-left px-4 py-3 font-medium">SAP</th>
                      {isAdmin && <th className="text-left px-4 py-3 font-medium">RC</th>}
                      <th className="text-right px-4 py-3 font-medium">Volume (KG)</th>
                      <th className="text-right px-4 py-3 font-medium">Pedidos</th>
                      <th className="text-right px-4 py-3 font-medium">Dias s/ Compra</th>
                      <th className="text-right px-4 py-3 font-medium">Ciclo Médio</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={`${c.clientCodeSAP}-${c.repCode}-${i}`} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium truncate max-w-[200px]">{c.clientName}</div>
                          {c.actionNote && c.manualStatus === "em_acao" && (
                            <div className="text-xs text-purple-600 mt-0.5 truncate max-w-[200px]">
                              → {c.actionNote}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.clientCodeSAP || "-"}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-muted-foreground text-xs">{c.repName || c.repCode}</td>
                        )}
                        <td className="px-4 py-3 text-right">{formatNumber(c.totalKg)}</td>
                        <td className="px-4 py-3 text-right">{c.orderCount}</td>
                        <td className="px-4 py-3 text-right">{c.daysSinceLastPurchase}</td>
                        <td className="px-4 py-3 text-right">{c.avgCycleDays > 0 ? `${c.avgCycleDays}d` : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={c.effectiveStatus} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setSelectedClient(c);
                                setActionType("");
                                setActionNote("");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Detail Dialog */}
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedClient?.clientName}</DialogTitle>
              <DialogDescription>
                SAP: {selectedClient?.clientCodeSAP || "N/A"} · RC: {selectedClient?.repName || selectedClient?.repCode}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Volume Total</p>
                  <p className="font-semibold">{formatNumber(selectedClient?.totalKg || 0)} kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Receita Total</p>
                  <p className="font-semibold">{formatCurrency(selectedClient?.totalRevenue || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dias sem Compra</p>
                  <p className="font-semibold">{selectedClient?.daysSinceLastPurchase || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ciclo Médio</p>
                  <p className="font-semibold">{selectedClient?.avgCycleDays > 0 ? `${selectedClient.avgCycleDays} dias` : "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
                <StatusBadge status={selectedClient?.effectiveStatus || "ativo"} />
              </div>

              {/* Last orders */}
              {selectedClient && (
                <ClientOrders clientCodeSAP={selectedClient.clientCodeSAP} />
              )}

              {/* Action controls */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Registrar Ação</p>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar ação..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_acao">Em Ação</SelectItem>
                    <SelectItem value="pedido_na_tela">Pedido na Tela</SelectItem>
                    <SelectItem value="excluido">Excluir do Acompanhamento</SelectItem>
                    <SelectItem value="reset">Resetar para Status Automático</SelectItem>
                  </SelectContent>
                </Select>
                {actionType === "em_acao" && (
                  <Textarea
                    placeholder="Descreva a ação (ex: visita agendada para 05/03)..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    rows={2}
                  />
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleAction}
                    disabled={!actionType || setActionMutation.isPending}
                    size="sm"
                  >
                    Confirmar
                  </Button>
                  {selectedClient?.manualStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActionType("reset");
                        setTimeout(handleAction, 0);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Resetar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function ClientOrders({ clientCodeSAP }: { clientCodeSAP: string }) {
  const { data: orders } = trpc.clients.orders.useQuery({ clientCodeSAP });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  if (!orders || orders.length === 0) return null;

  const last3 = orders.slice(0, 3);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Últimos Pedidos</p>
      <div className="space-y-2">
        {last3.map((o) => (
          <div key={o.orderCode} className="border rounded-lg p-2.5">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedOrder(expandedOrder === o.orderCode ? null : o.orderCode)}
            >
              <div className="text-xs">
                <span className="font-medium">{o.orderCode}</span>
                <span className="text-muted-foreground ml-2">
                  {o.invoiceDate ? new Date(o.invoiceDate).toLocaleDateString("pt-BR") : "-"}
                </span>
              </div>
              <span className="text-xs font-medium">
                {parseFloat(String(o.totalKg || 0)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
              </span>
            </div>
            {expandedOrder === o.orderCode && (
              <OrderProducts orderCode={o.orderCode} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderProducts({ orderCode }: { orderCode: string }) {
  const { data: products } = trpc.clients.orderProducts.useQuery({ orderCode });

  if (!products || products.length === 0) return <p className="text-xs text-muted-foreground mt-1">Sem produtos</p>;

  return (
    <div className="mt-2 border-t pt-2">
      {products.map((p, i) => {
        const kg = parseFloat(String(p.kgInvoiced || 0));
        const rev = parseFloat(String(p.revenueNoTax || 0));
        const pricePerKg = kg > 0 ? rev / kg : 0;
        return (
          <div key={i} className="flex justify-between text-xs py-0.5">
            <span className="truncate max-w-[180px]">{p.productName}</span>
            <span className="text-muted-foreground whitespace-nowrap ml-2">
              {kg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg ·{" "}
              {rev.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              {pricePerKg > 0 && (
                <span className="ml-1">
                  ({pricePerKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 })}/kg)
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
