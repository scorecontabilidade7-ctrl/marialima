import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const STORE_CLIENT_IDS: Record<string, string | string[]> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  consolidado: [
    "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
    "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  ],
};

export interface PASellerItem {
  vendedor: string;
  total_itens: number;
  total_atendimentos: number;
  total_valor: number;
  pa: number;
  ticket_medio: number;
  diff_vs_loja: number;
  url_foto?: string | null;
  peso_meta?: number;
  ativo?: boolean;
}

export interface PALojaKPIs {
  total_itens_loja: number;
  total_vendas_loja: number;
  total_valor_loja: number;
  pa_loja: number;
  ticket_medio_loja: number;
}

export interface PAAnalysisData {
  kpis: PALojaKPIs;
  ranking: PASellerItem[];
  clienteId: string;
}

export interface PAFilters {
  year: number;
  month: number;
  vendedores?: string[];
  vendedor?: string;
  dataInicio?: string;
  dataFim?: string;
}

/**
 * Função flexível de correspondência de nomes de vendedor:
 * - Remove espaços extras e compara em minúsculas
 * - Verifica igualdade exata ou se um nome inicia com o outro
 */
export function isSellerMatch(name1?: string | null, name2?: string | null): boolean {
  if (!name1 || !name2) return false;
  const n1 = name1.trim().toLowerCase();
  const n2 = name2.trim().toLowerCase();
  if (n1 === n2) return true;
  if (n1.startsWith(n2) || n2.startsWith(n1)) return true;
  return false;
}

export function usePAAnalysis(
  store: "sobral" | "itapipoca" | "consolidado" = "sobral",
  filters: PAFilters
) {
  return useQuery({
    queryKey: ["pa-analysis", store, filters],
    queryFn: async (): Promise<PAAnalysisData> => {
      const targetClient = STORE_CLIENT_IDS[store];
      if (!targetClient) {
        throw new Error(`Filial desconhecida ou não configurada: ${store}`);
      }

      // 1. Montar a query principal na tabela gigatech_ranking_vendedores
      let salesQuery = supabase
        .from("gigatech_ranking_vendedores")
        .select("cliente_id, data_venda, vendedor, qtd_total_vendas, valor_total_vendas, qtd_total_itens_vendidos, ticket_medio, pecas_por_atendimento");

      if (Array.isArray(targetClient)) {
        salesQuery = salesQuery.in("cliente_id", targetClient);
      } else {
        salesQuery = salesQuery.eq("cliente_id", targetClient);
      }

      // Filtro de data: se houver dataInicio e dataFim, usa o intervalo. Caso contrário, mês/ano
      if (filters.dataInicio || filters.dataFim) {
        if (filters.dataInicio) salesQuery = salesQuery.gte("data_venda", filters.dataInicio);
        if (filters.dataFim) salesQuery = salesQuery.lte("data_venda", filters.dataFim);
      } else {
        const start = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
        const lastDay = new Date(filters.year, filters.month, 0).getDate();
        const end = `${filters.year}-${String(filters.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        salesQuery = salesQuery.gte("data_venda", start).lte("data_venda", end);
      }

      // Filtro por vendedor(es), se aplicável
      if (filters.vendedores && filters.vendedores.length > 0 && !filters.vendedores.includes("all")) {
        salesQuery = salesQuery.in("vendedor", filters.vendedores);
      } else if (filters.vendedor && filters.vendedor !== "all") {
        salesQuery = salesQuery.eq("vendedor", filters.vendedor);
      }

      salesQuery = salesQuery.limit(50000);

      const [salesRes, multiConfigRes, mariaLimaConfigRes] = await Promise.all([
        salesQuery,
        // Buscar configurações na tabela multi_vendedores_config
        supabase
          .from("multi_vendedores_config")
          .select("cliente_id, nome_vendedor, url_foto, peso_meta, ativo"),
        // Buscar também na tabela marialima_vendedores_config para garantir fotos cadastradas
        supabase
          .from("marialima_vendedores_config")
          .select("nome_vendedor, url_foto, loja"),
      ]);

      if (salesRes.error) {
        throw new Error(`Erro ao buscar dados de vendas para P.A: ${salesRes.error.message}`);
      }

      const salesRows = salesRes.data || [];
      const multiConfigs = multiConfigRes.data || [];
      const mariaLimaConfigs = mariaLimaConfigRes.data || [];

      // 2. Cálculos consolidados da loja
      let total_itens_loja = 0;
      let total_vendas_loja = 0;
      let total_valor_loja = 0;

      // Mapa de agregação por vendedor normalizado
      const sellerMap = new Map<
        string,
        {
          rawName: string;
          total_itens: number;
          total_atendimentos: number;
          total_valor: number;
        }
      >();

      for (const row of salesRows) {
        const itens = Number(row.qtd_total_itens_vendidos) || 0;
        const vendas = Number(row.qtd_total_vendas) || 0;
        const valor = Number(row.valor_total_vendas) || 0;

        total_itens_loja += itens;
        total_vendas_loja += vendas;
        total_valor_loja += valor;

        const rawSeller = (row.vendedor || "Não informado").trim();
        const key = rawSeller.toLowerCase();

        const existing = sellerMap.get(key);
        if (existing) {
          existing.total_itens += itens;
          existing.total_atendimentos += vendas;
          existing.total_valor += valor;
        } else {
          sellerMap.set(key, {
            rawName: rawSeller,
            total_itens: itens,
            total_atendimentos: vendas,
            total_valor: valor,
          });
        }
      }

      const pa_loja = total_vendas_loja > 0 ? total_itens_loja / total_vendas_loja : 0;
      const ticket_medio_loja = total_vendas_loja > 0 ? total_valor_loja / total_vendas_loja : 0;

      // 3. Montar ranking por vendedor
      const ranking: PASellerItem[] = Array.from(sellerMap.values()).map((s) => {
        const pa = s.total_atendimentos > 0 ? s.total_itens / s.total_atendimentos : 0;
        const ticket_medio = s.total_atendimentos > 0 ? s.total_valor / s.total_atendimentos : 0;
        const diff_vs_loja = pa - pa_loja;

        // Buscar foto e dados nos configs
        const matchedMulti = multiConfigs.find((c) =>
          isSellerMatch(c.nome_vendedor, s.rawName)
        );
        const matchedMariaLima = mariaLimaConfigs.find((c) =>
          isSellerMatch(c.nome_vendedor, s.rawName)
        );

        const url_foto = matchedMulti?.url_foto || matchedMariaLima?.url_foto || null;
        const peso_meta = matchedMulti?.peso_meta ? Number(matchedMulti.peso_meta) : 1;
        const ativo = matchedMulti?.ativo !== undefined ? matchedMulti.ativo : true;

        return {
          vendedor: s.rawName,
          total_itens: s.total_itens,
          total_atendimentos: s.total_atendimentos,
          total_valor: s.total_valor,
          pa,
          ticket_medio,
          diff_vs_loja,
          url_foto,
          peso_meta,
          ativo,
        };
      });

      // 4. Ordenação decrescente: 1º P.A, 2º total_itens, 3º total_valor
      ranking.sort((a, b) => {
        if (b.pa !== a.pa) return b.pa - a.pa;
        if (b.total_itens !== a.total_itens) return b.total_itens - a.total_itens;
        return b.total_valor - a.total_valor;
      });

      const singleClienteId = Array.isArray(targetClient) ? targetClient[0] : targetClient;

      return {
        kpis: {
          total_itens_loja,
          total_vendas_loja,
          total_valor_loja,
          pa_loja,
          ticket_medio_loja,
        },
        ranking,
        clienteId: singleClienteId,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
