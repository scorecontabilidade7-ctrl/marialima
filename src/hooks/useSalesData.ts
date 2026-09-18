import { useQuery } from "@tanstack/react-query";
import { supabase as gigatechSupabase } from "@/integrations/supabase/client";

export interface DashboardKPIs {
  total_vendas: number;
  qtd_vendas: number;
  ticket_medio: number;
  total_comissoes: number;
}

export interface RankingItem {
  vendedor: string;
  total: number;
  comissao: number;
  qtd_vendas: number;
  url_foto?: string | null;
}

export interface TimelineItem {
  date: string;
  total: number;
  count: number;
}

export interface DepartmentItem {
  departamento: string;
  total: number;
}

export interface FilterOptions {
  vendedores: string[];
  departamentos: string[];
}

export interface DashboardData {
  kpis: DashboardKPIs;
  ranking: RankingItem[];
  timeline: TimelineItem[];
  departamentos: DepartmentItem[];
  filter_options: FilterOptions;
}

export interface SalesFilters {
  year: number;
  month: number;
  vendedor?: string;
  vendedores?: string[];
  departamento?: string;
  dataInicio?: string;
  dataFim?: string;
}

const STORE_CLIENT_IDS: Record<string, string | string[]> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  consolidado: [
    "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
    "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  ],
};

export interface Vendedor {
  numero_venda: number;
  vendedor: string;
  supervisor: string;
  valor_total: number;
  comissao_vendedor: number;
  comissao_supervisor: number;
  cliente: string;
  tipo_venda: string;
  data_venda: string;
}

export interface VendaDetalhada {
  venda: number;
  departamento: string;
  lucro: number;
  qtd: number;
  subtotal: number;
  data: string;
}

export interface RawSalesData {
  vendedores: Vendedor[];
  detalhada: VendaDetalhada[];
}

function transformDbVendedores(raw: any[]): Vendedor[] {
  return raw.map((r) => ({
    numero_venda: Number(r.n_cupom) || 0,
    vendedor: r.nome_vendedor || "",
    supervisor: "",
    valor_total: Number(r.valor_total) || 0,
    comissao_vendedor: Number(r.comissao_vendedor) || 0,
    comissao_supervisor: Number(r.comissao_supervisor) || 0,
    cliente: r.nome_cliente || "",
    tipo_venda: r.tipo_venda || "",
    data_venda: r.data_venda || "",
  }));
}

function transformDbDetalhada(raw: any[]): VendaDetalhada[] {
  return raw.map((r) => ({
    venda: Number(r.n_cupom) || 0,
    departamento: r.departamento || "",
    lucro: Number(r.margem) || 0,
    qtd: Number(r.quantidade) || 0,
    subtotal: Number(r.valor_venda) || 0,
    data: r.data_venda || "",
  }));
}

async function fetchRawSalesData(store: string, sellerName?: string): Promise<RawSalesData> {
  const clienteId = STORE_CLIENT_IDS[store];
  if (!clienteId) {
    throw new Error(`Filial desconhecida ou não configurada: ${store}`);
  }

  let vQuery = gigatechSupabase
    .from("gigatech_vendedores")
    .select("*")
    .eq("cliente_id", clienteId)
    .limit(100000);

  if (sellerName) {
    vQuery = vQuery.eq("nome_vendedor", sellerName);
  }

  const vendedoresRes = await vQuery;

  if (vendedoresRes.error) {
    throw new Error(`Erro ao buscar vendedores: ${vendedoresRes.error.message}`);
  }

  const vends = vendedoresRes.data || [];
  let detalhadaData: any[] = [];

  if (sellerName) {
    const cupoms = Array.from(new Set(vends.map((v: any) => v.n_cupom).filter(Boolean)));
    if (cupoms.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < cupoms.length; i += chunkSize) {
        const chunk = cupoms.slice(i, i + chunkSize);
        const chunkRes = await gigatechSupabase
          .from("gigatech_vendas")
          .select("*")
          .eq("cliente_id", clienteId)
          .in("n_cupom", chunk);
        if (chunkRes.data) {
          detalhadaData = detalhadaData.concat(chunkRes.data);
        }
      }
    }
  } else {
    const detalhadaRes = await gigatechSupabase
      .from("gigatech_vendas")
      .select("*")
      .eq("cliente_id", clienteId)
      .limit(100000);
    if (!detalhadaRes.error && detalhadaRes.data) {
      detalhadaData = detalhadaRes.data;
    }
  }

  return {
    vendedores: transformDbVendedores(vends),
    detalhada: transformDbDetalhada(detalhadaData),
  };
}

export function useRawSalesData(store: "sobral" | "itapipoca" = "sobral", sellerName?: string) {
  return useQuery({
    queryKey: ["raw-sales-data", store, sellerName],
    queryFn: () => fetchRawSalesData(store, sellerName),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

async function fetchDashboardData(store: string, filters: SalesFilters): Promise<DashboardData> {
  const targetClient = STORE_CLIENT_IDS[store];
  if (!targetClient) {
    throw new Error(`Filial desconhecida ou não configurada: ${store}`);
  }

  const isMultiStore = Array.isArray(targetClient);
  const clienteId = isMultiStore ? null : (targetClient as string);
  const clienteIds = isMultiStore ? (targetClient as string[]) : null;

  const hasMultiSellers = filters.vendedores && filters.vendedores.length > 0 && !filters.vendedores.includes("all");
  const pVendedores = hasMultiSellers ? filters.vendedores : null;
  const pVendedor = !hasMultiSellers && filters.vendedor && filters.vendedor !== "all" ? filters.vendedor : null;

  const { data, error } = await gigatechSupabase.rpc("marialima_get_dashboard_data", {
    p_cliente_id: clienteId,
    p_cliente_ids: clienteIds,
    p_year: filters.year,
    p_month: filters.month,
    p_vendedor: pVendedor,
    p_departamento: filters.departamento === "all" ? null : (filters.departamento || null),
    p_data_inicio: filters.dataInicio || null,
    p_data_fim: filters.dataFim || null,
    p_vendedores: pVendedores,
  });

  if (error) {
    throw new Error(`Erro ao buscar dados do dashboard: ${error.message}`);
  }

  return data as DashboardData;
}

export function useSalesData(store: "sobral" | "itapipoca" | "consolidado" = "sobral", filters: SalesFilters) {
  return useQuery({
    queryKey: ["sales-data", store, filters],
    queryFn: () => fetchDashboardData(store, filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDataExtracao() {
  return useQuery({
    queryKey: ["data-extracao"],
    queryFn: async () => {
      const { data, error } = await gigatechSupabase
        .from("gigatech_vendedores")
        .select("data_extracao")
        .in("cliente_id", [
          "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
          "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
        ])
        .not("data_extracao", "is", null)
        .order("data_extracao", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.data_extracao as string | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTopClients(store: "sobral" | "itapipoca" | "consolidado", filters: SalesFilters) {
  return useQuery({
    queryKey: ["top-clients", store, filters],
    queryFn: async () => {
      const targetClient = STORE_CLIENT_IDS[store];
      if (!targetClient) return [];

      let query = gigatechSupabase
        .from("gigatech_vendedores")
        .select("nome_cliente, valor_total");

      if (Array.isArray(targetClient)) {
        query = query.in("cliente_id", targetClient);
      } else {
        query = query.eq("cliente_id", targetClient);
      }

      query = query.limit(100000);

      if (filters.dataInicio || filters.dataFim) {
        if (filters.dataInicio) query = query.gte("data_venda", filters.dataInicio);
        if (filters.dataFim) query = query.lte("data_venda", filters.dataFim);
      } else {
        const start = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
        const lastDay = new Date(filters.year, filters.month, 0).getDate();
        const end = `${filters.year}-${String(filters.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        query = query.gte("data_venda", start).lte("data_venda", end);
      }

      if (filters.vendedores && filters.vendedores.length > 0 && !filters.vendedores.includes("all")) {
        query = query.in("nome_vendedor", filters.vendedores);
      } else if (filters.vendedor && filters.vendedor !== "all") {
        query = query.eq("nome_vendedor", filters.vendedor);
      }

      const { data, error } = await query;

      if (error) throw error;

      const map: Record<string, number> = {};
      (data || []).forEach((row) => {
        const c = row.nome_cliente || "Desconhecido";
        map[c] = (map[c] || 0) + (Number(row.valor_total) || 0);
      });

      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, total]) => ({ name, total }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
