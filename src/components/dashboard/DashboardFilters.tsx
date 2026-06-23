import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { FilterOptions } from "@/hooks/useSalesData";

interface DashboardFiltersProps {
  filterOptions?: FilterOptions;
  filters: {
    vendedor: string;
    departamento: string;
    dataInicio: string;
    dataFim: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export default function DashboardFilters({ filterOptions, filters, onFilterChange }: DashboardFiltersProps) {
  const uniqueVendedores = filterOptions?.vendedores || [];
  const uniqueDepartamentos = filterOptions?.departamentos || [];

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Data Início</label>
        <Input
          type="date"
          value={filters.dataInicio}
          onChange={(e) => onFilterChange("dataInicio", e.target.value)}
          className="w-40 h-9 bg-secondary border-border/50 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Data Fim</label>
        <Input
          type="date"
          value={filters.dataFim}
          onChange={(e) => onFilterChange("dataFim", e.target.value)}
          className="w-40 h-9 bg-secondary border-border/50 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Vendedor</label>
        <Select value={filters.vendedor} onValueChange={(v) => onFilterChange("vendedor", v)}>
          <SelectTrigger className="w-48 h-9 bg-secondary border-border/50 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueVendedores.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Departamento</label>
        <Select value={filters.departamento} onValueChange={(v) => onFilterChange("departamento", v)}>
          <SelectTrigger className="w-48 h-9 bg-secondary border-border/50 text-sm">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueDepartamentos.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
