import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryKPIs {
  total_items_qty: number;
  total_cost_value: number;
  total_sale_value: number;
  unique_skus: number;
}

export interface InventoryTreemapNode {
  name: string;
  value: number;
  qty: number;
}

export interface InventoryAbcItem {
  ean: string;
  produto: string;
  marca: string;
  cor: string;
  departamento: string;
  current_stock: number;
  custo_unitario: number;
  venda_unitario: number;
  custo_total: number;
  total_sold_qty: number;
  total_sold_value: number;
  last_sale_date: string | null;
  curva_abc: "A" | "B" | "C" | "Sem Venda";
  avg_daily_sales: number;
  days_of_supply: number;
  status: "Ruptura Crítica" | "Atenção" | "Estoque Saudável" | "Regular" | "Excesso de Estoque" | "Bazar (Obsoleto)";
}

export function useInventoryKPIs(store: string) {
  return useQuery({
    queryKey: ["inventory-kpis", store],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("marialima_get_inventory_kpis", { p_store: store });
      if (error) throw new Error(`Erro ao buscar KPIs de estoque: ${error.message}`);
      return (data || {}) as InventoryKPIs;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useInventoryTreemap(store: string, groupBy: "departamento" | "marca") {
  return useQuery({
    queryKey: ["inventory-treemap", store, groupBy],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("marialima_get_inventory_treemap", { p_store: store, p_group_by: groupBy });
      if (error) throw new Error(`Erro ao buscar Treemap de estoque: ${error.message}`);
      return (data || []) as InventoryTreemapNode[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryAbcReplenishment(store: string, days: number = 30) {
  return useQuery({
    queryKey: ["inventory-abc-replenishment", store, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("marialima_get_inventory_abc_replenishment", { p_store: store, p_days: days });
      if (error) throw new Error(`Erro ao buscar Curva ABC e Reposição: ${error.message}`);
      return (data || []) as InventoryAbcItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
