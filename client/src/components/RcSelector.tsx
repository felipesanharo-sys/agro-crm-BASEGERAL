import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface RcSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function RcSelector({ value, onChange }: RcSelectorProps) {
  const { user } = useAuth();
  const { data: repCodes } = trpc.repCodes.list.useQuery();
  const { data: aliases } = trpc.repAliases.list.useQuery();

  if ((user as any)?.role !== "admin") return null;

  const aliasMap = new Map((aliases || []).map((a) => [a.repCode, a.alias]));

  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : v)}
    >
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Todos os RCs" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os RCs</SelectItem>
        {(repCodes || []).map((rc) => (
          <SelectItem key={rc.repCode} value={rc.repCode}>
            {aliasMap.get(rc.repCode) || rc.repName || rc.repCode}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
