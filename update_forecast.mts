import fs from "fs";

const filePath = "client/src/pages/ForecastPage.tsx";
let content = fs.readFileSync(filePath, "utf-8");

// Adicionar imports
content = content.replace(
  'import { TrendingUp, Target, CheckCircle2, AlertCircle } from "lucide-react";',
  'import { TrendingUp, Target, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";\nimport { Button } from "@/components/ui/button";\nimport { useState, useMemo } from "react";\nimport { useToast } from "@/hooks/use-toast";'
);

// Adicionar hook de toast e mutation
content = content.replace(
  'export default function ForecastPage() {\n  const [selectedRc, setSelectedRc] = useState<string>("consolidado");\n  const [yearMonth, setYearMonth] = useState<string>("");',
  'export default function ForecastPage() {\n  const [selectedRc, setSelectedRc] = useState<string>("consolidado");\n  const [yearMonth, setYearMonth] = useState<string>("");\n  const { toast } = useToast();\n  const syncMutation = trpc.forecast.sync.useMutation();'
);

// Adicionar função handleSync
content = content.replace(
  '  const currentData = selectedRc === "consolidado" ? consolidated : rcData;\n  const isLoading = selectedRc === "consolidado" ? consolidatedLoading : false;',
  '  const currentData = selectedRc === "consolidado" ? consolidated : rcData;\n  const isLoading = selectedRc === "consolidado" ? consolidatedLoading : false;\n\n  const handleSync = async () => {\n    try {\n      await syncMutation.mutateAsync();\n      toast({\n        title: "Sucesso",\n        description: "Dados sincronizados com a planilha!",\n      });\n      // Refetch data\n      await Promise.all([\n        trpc.useUtils().forecast.consolidated.invalidate(),\n        trpc.useUtils().forecast.allRcs.invalidate(),\n      ]);\n    } catch (error) {\n      toast({\n        title: "Erro",\n        description: "Falha ao sincronizar dados",\n        variant: "destructive",\n      });\n    }\n  };'
);

fs.writeFileSync(filePath, content);
console.log("ForecastPage updated successfully");
