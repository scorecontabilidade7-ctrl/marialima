import { useState } from "react";
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useInventoryList, InventoryListItem } from "@/hooks/useInventoryList";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import { toast } from "sonner";

interface InventoryDataTableProps {
  store: "sobral" | "itapipoca";
}

export default function InventoryDataTable({ store }: InventoryDataTableProps) {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof InventoryListItem>("dias_parado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);

  // Use debounced search text for the API call to avoid spamming
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError } = useInventoryList(
    store,
    page,
    limit,
    debouncedSearch,
    sortCol,
    sortDir
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    // Simple inline debounce logic could go here, or just trigger on Enter/timeout
    // For simplicity, let's just set it directly with a small timeout
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setDebouncedSearch(search);
      setPage(0);
    }
  };

  const handleSort = (col: keyof InventoryListItem) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(0);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const clienteId = store === "sobral" ? "94759cb2-e37b-4b67-8f77-fb7ab251fff9" : "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72";
      let query = supabase.from('marialima_inventory_view').select('*').eq('cliente_id', clienteId);
      
      if (debouncedSearch) {
        query = query.or(`produto.ilike.%${debouncedSearch}%,ean.ilike.%${debouncedSearch}%,marca.ilike.%${debouncedSearch}%`);
      }

      const { data: allData, error } = await query.order(sortCol, { ascending: sortDir === 'asc' });

      if (error) throw error;
      if (!allData || allData.length === 0) {
        toast.error("Nenhum dado para exportar.");
        setIsExporting(false);
        return;
      }

      // Format data for Excel
      const excelData = allData.map(item => ({
        "EAN": item.ean,
        "Produto": item.produto,
        "Marca": item.marca,
        "Cor": item.cor,
        "Departamento": item.departamento,
        "Qtd": item.quantidade,
        "Custo": item.custo,
        "Valor Venda": item.valor_venda,
        "Lucro": item.lucro,
        "Última Venda": item.last_sale_date ? new Date(item.last_sale_date).toLocaleDateString('pt-BR') : 'Sem Venda',
        "Dias Parado": item.dias_parado ?? '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");

      XLSX.writeFile(workbook, `Estoque_Completo_${store}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Arquivo Excel gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar arquivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = data ? Math.ceil(data.count / limit) : 0;

  const SortableHeader = ({ label, col }: { label: string, col: keyof InventoryListItem }) => (
    <th className="px-4 py-3 font-semibold cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1">
        {label}
        {sortCol === col && <ArrowUpDown className="w-3 h-3 text-primary" />}
      </div>
    </th>
  );

  return (
    <div className="bg-card border border-border/60 rounded-xl shadow-sm flex flex-col overflow-hidden h-[calc(100vh-140px)]">
      {/* Header Actions */}
      <div className="px-5 py-4 border-b border-border/60 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-foreground">Listagem Completa</h3>
          <p className="text-xs text-muted-foreground">Todos os produtos, pesquisa e exportação ({data?.count || 0} itens).</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar (Enter para aplicar)..." 
              className="pl-9 h-9 w-64"
              value={search}
              onChange={handleSearch}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <button 
            onClick={exportToExcel}
            disabled={isExporting || !data?.data.length}
            className="flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            XLSX
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-destructive font-medium">Erro ao carregar dados.</p>
          </div>
        ) : null}
        
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-[11px] uppercase bg-secondary text-secondary-foreground border-b border-border/60 sticky top-0 z-10 shadow-sm">
            <tr>
              <SortableHeader label="EAN" col="ean" />
              <SortableHeader label="Produto" col="produto" />
              <SortableHeader label="Marca" col="marca" />
              <SortableHeader label="Cor" col="cor" />
              <SortableHeader label="Dept" col="departamento" />
              <SortableHeader label="Qtd" col="quantidade" />
              <SortableHeader label="Custo" col="custo" />
              <SortableHeader label="Venda" col="valor_venda" />
              <SortableHeader label="Lucro" col="lucro" />
              <SortableHeader label="Dias Parado" col="dias_parado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data?.data && data.data.length > 0 ? (
              data.data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{item.ean}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-foreground truncate max-w-[200px]" title={item.produto}>{item.produto}</p>
                  </td>
                  <td className="px-4 py-2">{item.marca}</td>
                  <td className="px-4 py-2">{item.cor}</td>
                  <td className="px-4 py-2">{item.departamento}</td>
                  <td className="px-4 py-2 font-semibold text-right">{item.quantidade}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.custo)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.valor_venda)}</td>
                  <td className="px-4 py-2 text-right text-green-600 font-medium">{formatCurrency(item.lucro)}</td>
                  <td className="px-4 py-2 text-center font-medium">
                    {item.dias_parado !== null ? (
                      <span className={item.dias_parado > 90 ? "text-red-500" : "text-muted-foreground"}>
                        {item.dias_parado} dias
                      </span>
                    ) : (
                      <span className="text-purple-500 text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded">S/ Venda</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
        <div className="text-xs text-muted-foreground">
          Mostrando {data?.data.length ? page * limit + 1 : 0} até {Math.min((page + 1) * limit, data?.count || 0)} de {data?.count || 0}
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={limit} 
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(0);
            }}
            className="text-xs h-8 bg-background border border-border rounded-md px-2"
          >
            <option value={10}>10 por pág</option>
            <option value={20}>20 por pág</option>
            <option value={50}>50 por pág</option>
          </select>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
