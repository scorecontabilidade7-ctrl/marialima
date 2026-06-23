import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabase as gigatechSupabase } from "@/integrations/supabase/client";
import { BR_TIME_ZONE, formatISODateInTimeZone } from "@/lib/utils";

function parseBRLNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function isUtcMidnight(date: Date) {
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function parseBRDate(value: unknown): string {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "";
    if (isUtcMidnight(value)) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, "0");
      const d = String(value.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return formatISODateInTimeZone(value, BR_TIME_ZONE);
  }

  if (typeof value === "number") {
    if (value < 100_000) {
      const dt = new Date(value * 86_400_000);
      if (isNaN(dt.getTime())) return "";
      const y = dt.getUTCFullYear();
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const dt = new Date(value);
    if (isNaN(dt.getTime())) return "";
    return formatISODateInTimeZone(dt, BR_TIME_ZONE);
  }

  if (typeof value !== "string") return "";

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;

  if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const dt = new Date(value);
    if (!isNaN(dt.getTime())) return formatISODateInTimeZone(dt, BR_TIME_ZONE);
    return value.slice(0, 10);
  }

  if (value.match(/^\d{4}-\d{2}-\d{2}/)) return value.slice(0, 10);

  return value;
}

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

interface SalesData {
  vendedores: Vendedor[];
  detalhada: VendaDetalhada[];
}

const STORE_CLIENT_IDS: Record<string, string> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
};

function transformDbVendedores(raw: any[]): Vendedor[] {
  return raw.map((r) => ({
    numero_venda: Number(r.n_cupom) || 0,
    vendedor: r.nome_vendedor || "",
    supervisor: "", // gigatech_vendedores não possui supervisor no DB
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
    lucro: Number(r.margem) || 0, // margem representa lucro/markup
    qtd: Number(r.quantidade) || 0,
    subtotal: Number(r.valor_venda) || 0, // valor_venda é o subtotal do item
    data: r.data_venda || "",
  }));
}

async function fetchSalesData(store: string): Promise<SalesData> {
  const clienteId = STORE_CLIENT_IDS[store];
  if (!clienteId) {
    throw new Error(`Filial desconhecida ou não configurada: ${store}`);
  }

  const [vendedoresRes, detalhadaRes] = await Promise.all([
    gigatechSupabase
      .from("gigatech_vendedores")
      .select("*")
      .eq("cliente_id", clienteId),
    gigatechSupabase
      .from("gigatech_vendas")
      .select("*")
      .eq("cliente_id", clienteId),
  ]);

  if (vendedoresRes.error) {
    throw new Error(`Erro ao buscar vendedores: ${vendedoresRes.error.message}`);
  }
  if (detalhadaRes.error) {
    throw new Error(`Erro ao buscar vendas detalhadas: ${detalhadaRes.error.message}`);
  }

  return {
    vendedores: transformDbVendedores(vendedoresRes.data || []),
    detalhada: transformDbDetalhada(detalhadaRes.data || []),
  };
}

export function useSalesData(store: "sobral" | "itapipoca" = "sobral") {
  return useQuery({
    queryKey: ["sales-data", store],
    queryFn: () => fetchSalesData(store),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
