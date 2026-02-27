import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const REQUIRED_FIELDS = [
  { key: "orderCode", label: "Código do Pedido" },
  { key: "orderItem", label: "Item do Pedido" },
  { key: "invoiceDate", label: "Data da Fatura" },
  { key: "repCode", label: "Código do RC" },
  { key: "repName", label: "Nome do RC" },
  { key: "clientName", label: "Nome do Cliente" },
  { key: "productName", label: "Nome do Produto" },
  { key: "kgInvoiced", label: "KG Faturado" },
];

const OPTIONAL_FIELDS = [
  { key: "clientCodeSAP", label: "Código SAP do Cliente" },
  { key: "salesChannel", label: "Canal de Vendas" },
  { key: "revenueNoTax", label: "Receita (sem impostos)" },
];

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "map" | "confirm" | "done">("select");

  const uploadMutation = trpc.upload.invoices.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.inserted} registros importados com sucesso!`);
      setStep("done");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const parseCSV = useCallback((text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ";" || char === ",") && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFile(f);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length < 2) {
          toast.error("Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados");
          return;
        }
        setHeaders(rows[0]);
        setAllRows(rows.slice(1));
        setPreviewRows(rows.slice(1, 6));

        // Auto-map by common names
        const autoMap: Record<string, string> = {};
        const headerLower = rows[0].map((h) => h.toLowerCase().trim());
        const mappings: Record<string, string[]> = {
          orderCode: ["pedido", "nº pedido", "codigo pedido", "order", "ordercode", "nro pedido", "cod pedido", "nº do pedido"],
          orderItem: ["item", "item pedido", "orderitem", "item do pedido"],
          invoiceDate: ["data", "data fatura", "data faturamento", "invoicedate", "dt faturamento", "data nf"],
          repCode: ["codigo rc", "cod rc", "repcode", "código representante", "cod representante", "cód. representante"],
          repName: ["nome rc", "representante", "repname", "nome representante"],
          clientCodeSAP: ["codigo sap", "cod sap", "clientcodesap", "código sap", "cod cliente", "codigo cliente"],
          clientName: ["cliente", "nome cliente", "clientname", "razão social"],
          salesChannel: ["canal", "canal vendas", "saleschannel", "canal de vendas"],
          productName: ["produto", "nome produto", "productname", "descrição produto"],
          kgInvoiced: ["kg", "kg faturado", "kginvoiced", "peso", "quantidade kg", "qtd kg"],
          revenueNoTax: ["receita", "valor", "receita s/ imposto", "revenuenotax", "vlr líquido", "valor líquido"],
        };

        for (const [field, aliases] of Object.entries(mappings)) {
          const idx = headerLower.findIndex((h) =>
            aliases.some((a) => h === a || h.includes(a))
          );
          if (idx >= 0) autoMap[field] = rows[0][idx];
        }
        setMapping(autoMap);
        setStep("map");
      };
      reader.readAsText(f, "utf-8");
    },
    [parseCSV]
  );

  const handleUpload = useCallback(() => {
    const rows = allRows.map((row) => {
      const obj: Record<string, string> = {};
      for (const [field, header] of Object.entries(mapping)) {
        const idx = headers.indexOf(header);
        if (idx >= 0) obj[field] = row[idx] || "";
      }
      return obj;
    });

    // Validate required fields
    const missingFields = REQUIRED_FIELDS.filter((f) => !mapping[f.key]);
    if (missingFields.length > 0) {
      toast.error(`Campos obrigatórios não mapeados: ${missingFields.map((f) => f.label).join(", ")}`);
      return;
    }

    uploadMutation.mutate({
      rows: rows as any,
      columnMapping: mapping,
    });
  }, [allRows, headers, mapping, uploadMutation]);

  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setMapping({});
    setStep("select");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload de Faturamento</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Importe dados de faturamento a partir de arquivos CSV
          </p>
        </div>

        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Arquivo</CardTitle>
              <CardDescription>
                Selecione um arquivo CSV com os dados de faturamento. O sistema aceita separadores ponto-e-vírgula (;) ou vírgula (,).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <FileUp className="h-10 w-10 text-muted-foreground mb-3" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste o arquivo CSV
                </span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </CardContent>
          </Card>
        )}

        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Colunas</CardTitle>
              <CardDescription>
                Arquivo: {file?.name} ({allRows.length} linhas). Mapeie as colunas do CSV para os campos do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-3">Campos Obrigatórios</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REQUIRED_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <label className="text-sm w-40 shrink-0 flex items-center gap-1.5">
                        {mapping[field.key] ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        {field.label}
                      </label>
                      <Select
                        value={mapping[field.key] || "unmapped"}
                        onValueChange={(v) =>
                          setMapping((prev) => ({
                            ...prev,
                            [field.key]: v === "unmapped" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">-- Não mapeado --</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-3">Campos Opcionais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {OPTIONAL_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center gap-2">
                      <label className="text-sm w-40 shrink-0">{field.label}</label>
                      <Select
                        value={mapping[field.key] || "unmapped"}
                        onValueChange={(v) =>
                          setMapping((prev) => ({
                            ...prev,
                            [field.key]: v === "unmapped" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">-- Não mapeado --</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Preview (primeiras 5 linhas)</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetForm}>
                  Voltar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || REQUIRED_FIELDS.some((f) => !mapping[f.key])}
                >
                  {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Importar {allRows.length} registros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 gap-4">
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <h2 className="text-xl font-bold">Importação Concluída!</h2>
              <p className="text-muted-foreground text-center">
                Os dados de faturamento foram importados com sucesso.
                Os meses já existentes foram substituídos pelos novos dados.
              </p>
              <Button onClick={resetForm} variant="outline">
                Importar outro arquivo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
