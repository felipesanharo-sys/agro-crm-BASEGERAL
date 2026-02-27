import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Check, Copy, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Configuracoes() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === "admin";

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas gestores podem acessar as configurações.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie convites, aliases de RCs e metas de vendas
          </p>
        </div>

        <Tabs defaultValue="invites" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invites">Convites</TabsTrigger>
            <TabsTrigger value="aliases">Aliases de RCs</TabsTrigger>
            <TabsTrigger value="goals">Metas de Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="invites">
            <InvitesTab />
          </TabsContent>
          <TabsContent value="aliases">
            <AliasesTab />
          </TabsContent>
          <TabsContent value="goals">
            <GoalsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Invites Tab ──────────────────────────────────────────────────────
function InvitesTab() {
  const [repCode, setRepCode] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: invites } = trpc.invites.list.useQuery();
  const { data: repCodes } = trpc.repCodes.list.useQuery();
  const { data: aliases } = trpc.repAliases.list.useQuery();

  const generateMutation = trpc.invites.generate.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/convite/${data.token}`;
      setGeneratedLink(link);
      utils.invites.list.invalidate();
      toast.success("Convite gerado com sucesso!");
    },
    onError: (err) => toast.error(err.message),
  });

  const aliasMap = new Map((aliases || []).map((a) => [a.repCode, a.alias]));

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gerar Novo Convite</CardTitle>
          <CardDescription>
            Gere um link de convite para vincular um RC ao sistema. Use "__GESTOR__" como código para convidar gestores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">Código do RC</Label>
              <Input
                placeholder="Ex: 12345 ou __GESTOR__"
                value={repCode}
                onChange={(e) => setRepCode(e.target.value)}
                list="rep-codes-list"
              />
              <datalist id="rep-codes-list">
                {(repCodes || []).map((rc) => (
                  <option key={rc.repCode} value={rc.repCode}>
                    {aliasMap.get(rc.repCode) || rc.repName}
                  </option>
                ))}
                <option value="__GESTOR__">Gestor (Admin)</option>
              </datalist>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => generateMutation.mutate({ repCode })}
                disabled={!repCode || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Link2 className="h-4 w-4 mr-1.5" />
                )}
                Gerar
              </Button>
            </div>
          </div>

          {generatedLink && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="text-xs flex-1 truncate">{generatedLink}</code>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Convites Gerados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium">RC</th>
                  <th className="text-left px-4 py-3 font-medium">Token</th>
                  <th className="text-left px-4 py-3 font-medium">Criado em</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(invites || []).map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="px-4 py-3">
                      {aliasMap.get(inv.repCode) || inv.repCode}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs">{inv.token.slice(0, 12)}...</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inv.usedAt ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Usado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Pendente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {(!invites || invites.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum convite gerado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Aliases Tab ──────────────────────────────────────────────────────
function AliasesTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ repCode: "", repName: "", alias: "", parentRepCode: "", neCode: "" });

  const utils = trpc.useUtils();
  const { data: aliases } = trpc.repAliases.list.useQuery();

  const upsertMutation = trpc.repAliases.upsert.useMutation({
    onSuccess: () => {
      toast.success("Alias salvo com sucesso!");
      utils.repAliases.list.invalidate();
      setShowDialog(false);
      setForm({ repCode: "", repName: "", alias: "", parentRepCode: "", neCode: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.repAliases.delete.useMutation({
    onSuccess: () => {
      toast.success("Alias removido!");
      utils.repAliases.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Aliases de Representantes</CardTitle>
            <CardDescription>
              Mapeie códigos de RC para nomes amigáveis e agrupe sub-representantes
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium">Código</th>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">Alias</th>
                  <th className="text-left px-4 py-3 font-medium">Pai</th>
                  <th className="text-left px-4 py-3 font-medium">NE</th>
                  <th className="text-center px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(aliases || []).map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="px-4 py-3 font-mono text-xs">{a.repCode}</td>
                    <td className="px-4 py-3">{a.repName}</td>
                    <td className="px-4 py-3 font-medium">{a.alias}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.parentRepCode || "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.neCode || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => deleteMutation.mutate({ id: a.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!aliases || aliases.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum alias cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Alias</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Código do RC *</Label>
              <Input value={form.repCode} onChange={(e) => setForm({ ...form, repCode: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Nome do RC *</Label>
              <Input value={form.repName} onChange={(e) => setForm({ ...form, repName: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Alias (nome amigável) *</Label>
              <Input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Código do RC Pai (opcional)</Label>
              <Input value={form.parentRepCode} onChange={(e) => setForm({ ...form, parentRepCode: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Código NE (opcional)</Label>
              <Input value={form.neCode} onChange={(e) => setForm({ ...form, neCode: e.target.value })} />
            </div>
            <Button
              onClick={() => upsertMutation.mutate(form)}
              disabled={!form.repCode || !form.repName || !form.alias || upsertMutation.isPending}
              className="w-full"
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Goals Tab ────────────────────────────────────────────────────────
function GoalsTab() {
  const now = new Date();
  const currentYM = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearMonth, setYearMonth] = useState(currentYM);
  const [form, setForm] = useState({ repCode: "", goalKg: "" });

  const utils = trpc.useUtils();
  const { data: goals } = trpc.salesGoals.list.useQuery({ yearMonth });
  const { data: repCodes } = trpc.repCodes.list.useQuery();
  const { data: aliases } = trpc.repAliases.list.useQuery();

  const upsertMutation = trpc.salesGoals.upsert.useMutation({
    onSuccess: () => {
      toast.success("Meta salva!");
      utils.salesGoals.list.invalidate();
      setForm({ repCode: "", goalKg: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const aliasMap = new Map((aliases || []).map((a) => [a.repCode, a.alias]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas de Vendas (KG)</CardTitle>
          <CardDescription>
            Defina metas mensais por RC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs mb-1.5 block">Mês</Label>
              <Input
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                placeholder="YYYY.MM"
                className="w-[120px]"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1.5 block">RC</Label>
              <Input
                value={form.repCode}
                onChange={(e) => setForm({ ...form, repCode: e.target.value })}
                placeholder="Código do RC"
                list="goals-rep-codes"
              />
              <datalist id="goals-rep-codes">
                {(repCodes || []).map((rc) => (
                  <option key={rc.repCode} value={rc.repCode}>
                    {aliasMap.get(rc.repCode) || rc.repName}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Meta (KG)</Label>
              <Input
                value={form.goalKg}
                onChange={(e) => setForm({ ...form, goalKg: e.target.value })}
                placeholder="Ex: 50000"
                className="w-[120px]"
              />
            </div>
            <Button
              onClick={() => upsertMutation.mutate({ ...form, yearMonth })}
              disabled={!form.repCode || !form.goalKg || upsertMutation.isPending}
            >
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas para {yearMonth}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium">RC</th>
                  <th className="text-right px-4 py-3 font-medium">Meta (KG)</th>
                </tr>
              </thead>
              <tbody>
                {(goals || []).map((g) => (
                  <tr key={g.id} className="border-b">
                    <td className="px-4 py-3">{aliasMap.get(g.repCode) || g.repCode}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {parseFloat(g.goalKg).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
                {(!goals || goals.length === 0) && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma meta definida para este mês
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
