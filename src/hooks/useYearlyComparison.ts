import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MONTH_SHORT_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const STORE_CLIENT_IDS: Record<string, string | string[]> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  consolidado: [
    "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
    "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  ],
};

export interface YearlyMonthComparison {
  mes: number;
  nomeMes: string;
  siglaMes: string;
  baseValor: number;
  compareValor: number;
  diferenca: number;
  crescimentoPercentual: number;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
}

export interface YearlyComparisonSummary {
  baseYear: number;
  compareYear: number;
  baseTotal: number;
  compareTotal: number;
  diferencaTotal: number;
  taxaCrescimentoAnual: number;
  // Year to Date (YTD) - comparando apenas os meses com dados em ambos os anos
  ytdBaseTotal: number;
  ytdCompareTotal: number;
  ytdDiferenca: number;
  ytdTaxaCrescimento: number;
  ytdMesesQtd: number;
  mediaMensalBase: number;
  mediaMensalCompare: number;
  melhorMesBase: { mes: number; nomeMes: string; valor: number };
  melhorMesCompare: { mes: number; nomeMes: string; valor: number };
  piorMesBase: { mes: number; nomeMes: string; valor: number };
  piorMesCompare: { mes: number; nomeMes: string; valor: number };
}

export interface YearlyComparisonData {
  months: YearlyMonthComparison[];
  summary: YearlyComparisonSummary;
  availableYears: number[];
}

/**
 * Calcula a taxa de crescimento percentual:
 * ((Atual / Anterior) - 1) * 100
 */
export function calculateGrowthRate(atual: number, anterior: number): number {
  if (anterior > 0) {
    return ((atual / anterior) - 1) * 100;
  }
  if (atual > 0) {
    return 100;
  }
  return 0;
}

async function fetchYearData(
  store: "sobral" | "itapipoca" | "consolidado",
  year: number
): Promise<Record<number, number>> {
  const monthlyTotals: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };

  if (year <= 2025) {
    // Busca do faturamento histórico
    let query = supabase
      .from("marialima_faturamento_historico")
      .select("mes, loja, total_vendas")
      .eq("ano", year);

    if (store === "sobral" || store === "itapipoca") {
      query = query.eq("loja", store);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Erro ao buscar histórico de ${year}:`, error);
      return monthlyTotals;
    }

    (data || []).forEach((row: any) => {
      const m = Number(row.mes);
      const val = Number(row.total_vendas) || 0;
      if (m >= 1 && m <= 12) {
        monthlyTotals[m] = (monthlyTotals[m] || 0) + val;
      }
    });

    return monthlyTotals;
  }

  // Para 2026 em diante: busca em tempo real da tabela gigatech_vendedores
  const targetClient = STORE_CLIENT_IDS[store];
  if (!targetClient) return monthlyTotals;

  let query = supabase
    .from("gigatech_vendedores")
    .select("data_venda, valor_total")
    .gte("data_venda", `${year}-01-01`)
    .lte("data_venda", `${year}-12-31`)
    .limit(100000);

  if (Array.isArray(targetClient)) {
    query = query.in("cliente_id", targetClient);
  } else {
    query = query.eq("cliente_id", targetClient);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Erro ao buscar vendas ao vivo de ${year}:`, error);
    return monthlyTotals;
  }

  (data || []).forEach((row: any) => {
    if (row.data_venda) {
      const parts = row.data_venda.split("-");
      if (parts.length >= 2) {
        const monthNum = parseInt(parts[1], 10);
        const val = Number(row.valor_total) || 0;
        if (monthNum >= 1 && monthNum <= 12) {
          monthlyTotals[monthNum] = (monthlyTotals[monthNum] || 0) + val;
        }
      }
    }
  });

  return monthlyTotals;
}

export function useYearlyComparison(
  store: "sobral" | "itapipoca" | "consolidado" = "sobral",
  baseYear: number = 2026,
  compareYear: number = 2025
) {
  return useQuery({
    queryKey: ["yearly-comparison", store, baseYear, compareYear],
    queryFn: async (): Promise<YearlyComparisonData> => {
      const [baseMonthly, compareMonthly] = await Promise.all([
        fetchYearData(store, baseYear),
        fetchYearData(store, compareYear),
      ]);

      const months: YearlyMonthComparison[] = [];
      let baseTotal = 0;
      let compareTotal = 0;

      let ytdBaseTotal = 0;
      let ytdCompareTotal = 0;
      let ytdMesesQtd = 0;

      let maxBase = { mes: 1, nomeMes: MONTH_NAMES[0], valor: -1 };
      let minBase = { mes: 1, nomeMes: MONTH_NAMES[0], valor: Infinity };
      let maxComp = { mes: 1, nomeMes: MONTH_NAMES[0], valor: -1 };
      let minComp = { mes: 1, nomeMes: MONTH_NAMES[0], valor: Infinity };

      for (let m = 1; m <= 12; m++) {
        const bVal = baseMonthly[m] || 0;
        const cVal = compareMonthly[m] || 0;
        const diff = bVal - cVal;
        const growth = calculateGrowthRate(bVal, cVal);

        baseTotal += bVal;
        compareTotal += cVal;

        // YTD: se houver venda no ano base, considera para o YTD
        if (bVal > 0) {
          ytdBaseTotal += bVal;
          ytdCompareTotal += cVal;
          ytdMesesQtd++;
        }

        if (bVal > maxBase.valor) maxBase = { mes: m, nomeMes: MONTH_NAMES[m - 1], valor: bVal };
        if (bVal > 0 && bVal < minBase.valor) minBase = { mes: m, nomeMes: MONTH_NAMES[m - 1], valor: bVal };

        if (cVal > maxComp.valor) maxComp = { mes: m, nomeMes: MONTH_NAMES[m - 1], valor: cVal };
        if (cVal > 0 && cVal < minComp.valor) minComp = { mes: m, nomeMes: MONTH_NAMES[m - 1], valor: cVal };

        months.push({
          mes: m,
          nomeMes: MONTH_NAMES[m - 1],
          siglaMes: MONTH_SHORT_NAMES[m - 1],
          baseValor: bVal,
          compareValor: cVal,
          diferenca: diff,
          crescimentoPercentual: growth,
          isPositive: diff > 0,
          isNegative: diff < 0,
          isZero: diff === 0,
        });
      }

      if (minBase.valor === Infinity) minBase = { mes: 1, nomeMes: MONTH_NAMES[0], valor: 0 };
      if (minComp.valor === Infinity) minComp = { mes: 1, nomeMes: MONTH_NAMES[0], valor: 0 };

      const diferencaTotal = baseTotal - compareTotal;
      const taxaCrescimentoAnual = calculateGrowthRate(baseTotal, compareTotal);

      const ytdDiferenca = ytdBaseTotal - ytdCompareTotal;
      const ytdTaxaCrescimento = calculateGrowthRate(ytdBaseTotal, ytdCompareTotal);

      const mediaMensalBase = baseTotal / 12;
      const mediaMensalCompare = compareTotal / 12;

      const summary: YearlyComparisonSummary = {
        baseYear,
        compareYear,
        baseTotal,
        compareTotal,
        diferencaTotal,
        taxaCrescimentoAnual,
        ytdBaseTotal,
        ytdCompareTotal,
        ytdDiferenca,
        ytdTaxaCrescimento,
        ytdMesesQtd,
        mediaMensalBase,
        mediaMensalCompare,
        melhorMesBase: maxBase,
        melhorMesCompare: maxComp,
        piorMesBase: minBase,
        piorMesCompare: minComp,
      };

      const availableYears = [2026, 2025, 2024, 2023];

      return {
        months,
        summary,
        availableYears,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
