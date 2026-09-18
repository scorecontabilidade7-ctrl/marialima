import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FilterX, ChevronsUpDown, Check, Search, X, Users } from "lucide-react";
import type { FilterOptions } from "@/hooks/useSalesData";
import { BR_TIME_ZONE, getDatePartsInTimeZone, cn } from "@/lib/utils";

interface DashboardFiltersProps {
  filterOptions?: FilterOptions;
  filters: {
    vendedor?: string;
    vendedores?: string[];
    departamento: string;
    dataInicio: string;
    dataFim: string;
  };
  selectedMonth?: { year: number; month: number };
  onFilterChange: (key: string, value: any) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export default function DashboardFilters({
  filterOptions,
  filters,
  selectedMonth,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: DashboardFiltersProps) {
  const uniqueVendedores = filterOptions?.vendedores || [];
  const uniqueDepartamentos = filterOptions?.departamentos || [];

  const [sellerSearch, setSellerSearch] = useState("");
  const [openSellerPopover, setOpenSellerPopover] = useState(false);

  const selectedVendedores = useMemo(() => {
    if (Array.isArray(filters.vendedores)) {
      return filters.vendedores;
    }
    if (filters.vendedor && filters.vendedor !== "all") {
      return [filters.vendedor];
    }
    return [];
  }, [filters.vendedores, filters.vendedor]);

  const filteredVendedoresList = useMemo(() => {
    if (!sellerSearch.trim()) return uniqueVendedores;
    const lower = sellerSearch.toLowerCase();
    return uniqueVendedores.filter((v) => v.toLowerCase().includes(lower));
  }, [uniqueVendedores, sellerSearch]);

  const isAllSellers = selectedVendedores.length === 0;

  const toggleVendedor = (seller: string) => {
    let next: string[];
    if (selectedVendedores.includes(seller)) {
      next = selectedVendedores.filter((s) => s !== seller);
    } else {
      next = [...selectedVendedores, seller];
    }
    onFilterChange("vendedores", next);
    onFilterChange("vendedor", next.length === 1 ? next[0] : (next.length === 0 ? "all" : next.join(",")));
  };

  const selectAllSellers = () => {
    onFilterChange("vendedores", [...uniqueVendedores]);
    onFilterChange("vendedor", "all");
  };

  const clearSellers = () => {
    onFilterChange("vendedores", []);
    onFilterChange("vendedor", "all");
  };

  const now = new Date();
  const { year, month } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const day = parseInt(now.toLocaleDateString("pt-BR", { timeZone: BR_TIME_ZONE, day: "numeric" }), 10);
  const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end w-full">
      {/* Data Início */}
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

      {/* Data Fim */}
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

      {/* Vendedores - Multi-Select */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-muted-foreground font-medium">Vendedor(es)</label>
          {selectedVendedores.length > 0 && (
            <span className="text-[10px] text-primary font-semibold">
              {selectedVendedores.length} selecionado{selectedVendedores.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Popover open={openSellerPopover} onOpenChange={setOpenSellerPopover}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openSellerPopover}
              className="w-full sm:w-56 h-9 bg-secondary border-border/50 text-sm justify-between px-3 font-normal hover:bg-secondary/80 focus:ring-1 focus:ring-primary"
            >
              {isAllSellers ? (
                <span className="truncate text-foreground">Todos</span>
              ) : selectedVendedores.length === 1 ? (
                <span className="truncate text-foreground font-medium">{selectedVendedores[0]}</span>
              ) : (
                <div className="flex items-center gap-1.5 truncate">
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 h-5 text-xs font-bold bg-primary/20 text-primary border border-primary/30"
                  >
                    {selectedVendedores.length}
                  </Badge>
                  <span className="truncate text-foreground font-medium">vendedores</span>
                </div>
              )}
              <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ml-2" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[85vw] sm:w-[280px] p-0 shadow-lg border-border bg-popover" align="start">
            {/* Search Input */}
            <div className="p-2 border-b border-border/60">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar vendedor..."
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs bg-muted/40 border-border/60"
                />
                {sellerSearch && (
                  <button
                    onClick={() => setSellerSearch("")}
                    className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/40 text-xs">
              <button
                onClick={selectAllSellers}
                className="text-primary hover:underline font-medium text-[11px]"
              >
                Selecionar Todos
              </button>
              <button
                onClick={clearSellers}
                className="text-muted-foreground hover:text-foreground font-medium text-[11px]"
              >
                Limpar seleção
              </button>
            </div>

            {/* Seller List */}
            <div className="max-h-[220px] overflow-y-auto p-1 divide-y divide-border/20">
              {/* Option "Todos" */}
              <div
                onClick={clearSellers}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium transition-colors select-none",
                  isAllSellers
                    ? "bg-primary/15 text-primary font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    isAllSellers
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {isAllSellers && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <Users className="w-3.5 h-3.5 opacity-70" />
                  <span>Todos os vendedores</span>
                </div>
              </div>

              {/* Individual sellers */}
              <div className="pt-1 space-y-0.5">
                {filteredVendedoresList.map((v) => {
                  const isChecked = selectedVendedores.includes(v);
                  return (
                    <div
                      key={v}
                      onClick={() => toggleVendedor(v)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs transition-colors select-none",
                        isChecked
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/70 text-foreground"
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleVendedor(v)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="truncate flex-1">{v}</span>
                    </div>
                  );
                })}

                {filteredVendedoresList.length === 0 && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Nenhum vendedor encontrado
                  </div>
                )}
              </div>
            </div>

            {/* Footer with count */}
            <div className="p-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{uniqueVendedores.length} vendedores disponíveis</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] text-primary hover:text-primary font-semibold"
                onClick={() => setOpenSellerPopover(false)}
              >
                Pronto
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Departamento */}
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

      {/* Limpar Filtros */}
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
