import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryListItem {
  id: string;
  cliente_id: string;
  ean: string;
  produto: string;
  marca: string;
  cor: string;
  departamento: string;
  quantidade: number;
  custo: number;
  valor_venda: number;
  lucro: number;
  last_sale_date: string | null;
  dias_parado: number | null;
}

export function useInventoryList(
  store: "sobral" | "itapipoca",
  page: number,
  limit: number,
  search: string,
  sortCol: keyof InventoryListItem = 'produto',
  sortDir: 'asc' | 'desc' = 'asc'
) {
  return useQuery({
    queryKey: ['inventoryList', store, page, limit, search, sortCol, sortDir],
    queryFn: async () => {
      // Identificadores baseados na regra de negócio atual
      const clienteId = store === "sobral" ? "94759cb2-e37b-4b67-8f77-fb7ab251fff9" : "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72";
      
      let query = supabase
        .from('marialima_inventory_view')
        .select('*', { count: 'exact' })
        .eq('cliente_id', clienteId);

      if (search) {
        query = query.or(`produto.ilike.%${search}%,ean.ilike.%${search}%,marca.ilike.%${search}%`);
      }

      // Calculando range para paginação (0-based)
      const from = page * limit;
      const to = from + limit - 1;

      query = query
        .order(sortCol, { ascending: sortDir === 'asc', nullsFirst: false })
        .range(from, to);

      const { data, count, error } = await query;
      
      if (error) {
        console.error("Erro ao buscar listagem de estoque:", error);
        throw error;
      }
      
      return { 
        data: data as InventoryListItem[], 
        count: count || 0 
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
