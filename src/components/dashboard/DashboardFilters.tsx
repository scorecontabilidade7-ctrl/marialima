import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterX } from "lucide-react";
import type { FilterOptions } from "@/hooks/useSalesData";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";

interface DashboardFiltersProps {
  filterOptions?: FilterOptions;
  filters: {
    vendedor: string;
    departamento: string;
    dataInicio: string;
    dataFim: string;
  };
  selectedMonth?: { year: number; month: number };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export default function DashboardFilters({ filterOptions, filters, selectedMonth, onFilterChange, onClearFilters, hasActiveFilters }: DashboardFiltersProps) {
  const uniqueVendedores = filterOptions?.vendedores || [];
  const uniqueDepartamentos = filterOptions?.departamentos || [];

  const now = new Date();
  const { year, month } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const day = parseInt(now.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "numeric" }), 10);
  const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end w-full">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Data Início</label>
        <Input
          type="date"
          value={filters.dataInicio}
          max={filters.dataFim || todayStr}
          onChange={(e) => onFilterChange("dataInicio", e.target.value)}
          className="w-full sm:w-40 h-9 bg-secondary border-border/50 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Data Fim</label>
        <Input
          type="date"
          value={filters.dataFim}
          min={filters.dataInicio || undefined}
          max={todayStr}
          onChange={(e) => onFilterChange("dataFim", e.target.value)}
          className="w-full sm:w-40 h-9 bg-secondary border-border/50 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Vendedor</label>
        <Select value={filters.vendedor} onValueChange={(v) => onFilterChange("vendedor", v)}>
          <SelectTrigger className="w-full sm:w-48 h-9 bg-secondary border-border/50 text-sm">
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
          <SelectTrigger className="w-full sm:w-48 h-9 bg-secondary border-border/50 text-sm">
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

      {onClearFilters && (
        <div className="sm:pb-[1px] self-end mt-2 sm:mt-0 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters} 
            disabled={!hasActiveFilters}
            className={`w-full sm:w-auto h-9 font-medium transition-colors ${
              hasActiveFilters 
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive" 
                : "text-muted-foreground"
            }`}
          >
            <FilterX className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  );
}
