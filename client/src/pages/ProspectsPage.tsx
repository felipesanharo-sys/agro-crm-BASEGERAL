import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
} from "lucide-react";

// ---- Types ----
type Stage = "contato_inicial" | "proposta_enviada" | "em_negociacao" | "ganho" | "perdido";
type Channel = "revenda" | "consumidor" | "industria";

interface Prospect {
  id: number;
  repCode: string;
  companyName: string;
  contactName: string | null;
  channel: Channel;
  potentialKg: string | null;
  potentialBrl: string | null;
  stage: Stage;
  notes: string | null;
  nextContactDate: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ---- Constants ----
const STAGE_LABELS: Record<Stage, string> = {
  contato_inicial: "Contato Inicial",
  proposta_enviada: "Proposta Enviada",
  em_negociacao: "Em Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

const STAGE_COLORS: Record<Stage, string> = {
  contato_inicial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  proposta_enviada: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  em_negociacao: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  ganho: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  perdido: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const CHANNEL_LABELS: Record<Channel, string> = {
  revenda: "Revenda",
  consumidor: "Consumidor",
  industria: "Indústria",
};

const CHANNEL_COLORS: Record<Channel, string> = {
  revenda: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  consumidor: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  industria: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const STAGES: Stage[] = ["contato_inicial", "proposta_enviada", "em_negociacao", "ganho", "perdido"];

// ---- Helpers ----
function fmtKg(val: string | null | undefined): string {
  if (!val) return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " kg";
}

function fmtBrl(val: string | null | undefined): string {
  if (!val) return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function toInputDate(val: Date | string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

// ---- Form State ----
interface FormState {
  companyName: string;
  contactName: string;
  channel: Channel | "";
  potentialKg: string;
  potentialBrl: string;
  stage: Stage;
  notes: string;
  nextContactDate: string;
}

const emptyForm: FormState = {
  companyName: "",
  contactName: "",
  channel: "",
  potentialKg: "",
  potentialBrl: "",
  stage: "contato_inicial",
  notes: "",
  nextContactDate: "",
};

// ---- Main Component ----
export default function ProspectsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  // Filters
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterRep, setFilterRep] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Expanded rows
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch data
  const { data: prospects = [], isLoading } = trpc.prospects.list.useQuery({
    stage: filterStage !== "all" ? filterStage : undefined,
    channel: filterChannel !== "all" ? filterChannel : undefined,
    repCode: isAdmin && filterRep !== "all" ? filterRep : undefined,
  });

  // Fetch rep options for admin filter
  const { data: repOptions = [] } = trpc.profile.getRepOptions.useQuery();

  // Mutations
  const createMutation = trpc.prospects.create.useMutation({
    onSuccess: () => {
      utils.prospects.list.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Prospect cadastrado com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
  });

  const updateMutation = trpc.prospects.update.useMutation({
    onSuccess: () => {
      utils.prospects.list.invalidate();
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Prospect atualizado com sucesso!");
    },
    onError: (err) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const deleteMutation = trpc.prospects.delete.useMutation({
    onSuccess: () => {
      utils.prospects.list.invalidate();
      setDeleteId(null);
      toast.success("Prospect removido.");
    },
    onError: (err) => toast.error(`Erro ao remover: ${err.message}`),
  });

  // Filtered list
  const filtered = useMemo(() => {
    if (!searchText.trim()) return prospects as Prospect[];
    const q = searchText.toLowerCase();
    return (prospects as Prospect[]).filter(
      (p) =>
        p.companyName.toLowerCase().includes(q) ||
        (p.contactName || "").toLowerCase().includes(q) ||
        (p.notes || "").toLowerCase().includes(q)
    );
  }, [prospects, searchText]);

  // Summary cards
  const summary = useMemo(() => {
    const all = prospects as Prospect[];
    const totalKg = all.reduce((s, p) => s + (p.potentialKg ? Number(p.potentialKg) : 0), 0);
    const totalBrl = all.reduce((s, p) => s + (p.potentialBrl ? Number(p.potentialBrl) : 0), 0);
    const byStageCounts = STAGES.reduce((acc, s) => {
      acc[s] = all.filter((p) => p.stage === s).length;
      return acc;
    }, {} as Record<Stage, number>);
    return { total: all.length, totalKg, totalBrl, byStageCounts };
  }, [prospects]);

  // Open create dialog
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  // Open edit dialog
  function openEdit(p: Prospect) {
    setEditingId(p.id);
    setForm({
      companyName: p.companyName,
      contactName: p.contactName ?? "",
      channel: p.channel,
      potentialKg: p.potentialKg ? String(Number(p.potentialKg)) : "",
      potentialBrl: p.potentialBrl ? String(Number(p.potentialBrl)) : "",
      stage: p.stage,
      notes: p.notes ?? "",
      nextContactDate: toInputDate(p.nextContactDate),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.companyName.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    if (!form.channel) {
      toast.error("Canal é obrigatório");
      return;
    }
    const payload = {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim() || undefined,
      channel: form.channel as Channel,
      potentialKg: form.potentialKg ? Number(form.potentialKg) : undefined,
      potentialBrl: form.potentialBrl ? Number(form.potentialBrl) : undefined,
      stage: form.stage,
      notes: form.notes.trim() || undefined,
      nextContactDate: form.nextContactDate || undefined,
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Prospects
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie seu pipeline de prospecção de novos clientes
            </p>
          </div>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Prospect
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">prospects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Potencial KG
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">
                {summary.totalKg > 0
                  ? summary.totalKg.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">kg estimados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Potencial R$
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">
                {summary.totalBrl > 0
                  ? summary.totalBrl.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      maximumFractionDigits: 0,
                    })
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">receita estimada</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.byStageCounts.ganho}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">convertidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Stage pipeline mini-bar */}
        {summary.total > 0 && (
          <div className="flex gap-2 flex-wrap">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStage(filterStage === s ? "all" : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  filterStage === s
                    ? "ring-2 ring-primary ring-offset-1"
                    : "opacity-80 hover:opacity-100"
                } ${STAGE_COLORS[s]}`}
              >
                {STAGE_LABELS[s]}
                <span className="font-bold">{summary.byStageCounts[s]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros:
          </div>
          <Input
            placeholder="Buscar empresa ou contato..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-56 h-8 text-sm"
          />
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              <SelectItem value="revenda">Revenda</SelectItem>
              <SelectItem value="consumidor">Consumidor</SelectItem>
              <SelectItem value="industria">Indústria</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filterRep} onValueChange={setFilterRep}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue placeholder="RC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os RCs</SelectItem>
                {repOptions.map((r: any) => (
                  <SelectItem key={r.repCode} value={r.repCode}>
                    {r.alias}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(filterStage !== "all" || filterChannel !== "all" || filterRep !== "all" || searchText) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setFilterStage("all");
                setFilterChannel("all");
                setFilterRep("all");
                setSearchText("");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Target className="h-12 w-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground font-medium">Nenhum prospect encontrado</p>
            <p className="text-sm text-muted-foreground">
              {summary.total === 0
                ? "Clique em \"Novo Prospect\" para começar a registrar oportunidades."
                : "Tente ajustar os filtros."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <ProspectCard
                key={p.id}
                prospect={p}
                isExpanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onEdit={() => openEdit(p)}
                onDelete={() => setDeleteId(p.id)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId !== null ? "Editar Prospect" : "Novo Prospect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Empresa *</Label>
              <Input
                id="companyName"
                placeholder="Nome da empresa"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactName">Contato</Label>
              <Input
                id="contactName"
                placeholder="Nome do contato (opcional)"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as Channel })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenda">Revenda</SelectItem>
                    <SelectItem value="consumidor">Consumidor</SelectItem>
                    <SelectItem value="industria">Indústria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fase</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="potentialKg">Potencial (kg)</Label>
                <Input
                  id="potentialKg"
                  type="number"
                  min="0"
                  placeholder="Ex: 5000"
                  value={form.potentialKg}
                  onChange={(e) => setForm({ ...form, potentialKg: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="potentialBrl">Potencial (R$)</Label>
                <Input
                  id="potentialBrl"
                  type="number"
                  min="0"
                  placeholder="Ex: 25000"
                  value={form.potentialBrl}
                  onChange={(e) => setForm({ ...form, potentialBrl: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextContactDate">Próximo Contato</Label>
              <Input
                id="nextContactDate"
                type="date"
                value={form.nextContactDate}
                onChange={(e) => setForm({ ...form, nextContactDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Detalhes sobre a oportunidade, histórico de contatos..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Salvando..." : editingId !== null ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover prospect?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O prospect será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
       </AlertDialog>
    </>
  );
}

// ---- Prospect Card Component ----
interface ProspectCardProps {
  prospect: Prospect;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}

function ProspectCard({ prospect: p, isExpanded, onToggle, onEdit, onDelete, isAdmin }: ProspectCardProps) {
  const hasDetails = p.notes || p.nextContactDate || p.potentialKg || p.potentialBrl;

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        {/* Stage badge (left accent) */}
        <div className="flex-shrink-0 mt-0.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[p.stage]}`}>
            {STAGE_LABELS[p.stage]}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm leading-tight">{p.companyName}</p>
              {p.contactName && (
                <p className="text-xs text-muted-foreground mt-0.5">{p.contactName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_COLORS[p.channel]}`}>
                {CHANNEL_LABELS[p.channel]}
              </span>
            </div>
          </div>

          {/* Potentials row */}
          <div className="flex flex-wrap gap-3 mt-2">
            {p.potentialKg && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" />
                {fmtKg(p.potentialKg)}
              </span>
            )}
            {p.potentialBrl && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {fmtBrl(p.potentialBrl)}
              </span>
            )}
            {p.nextContactDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtDate(p.nextContactDate)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Remover">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {hasDetails && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} title="Expandir">
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="border-t px-4 py-3 bg-muted/30 space-y-2">
          {p.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Cadastrado em {fmtDate(p.createdAt)}</span>
            {p.updatedAt !== p.createdAt && <span>Atualizado em {fmtDate(p.updatedAt)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
