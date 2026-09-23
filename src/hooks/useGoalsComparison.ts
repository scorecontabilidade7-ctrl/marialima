import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MONTH_NAMES, MONTH_SHORT_NAMES } from "@/hooks/useYearlyComparison";

export type GoalType = "esperado" | "minima" | "top1" | "top2" | "master";

export interface MonthlyGoalComparisonItem {
  mes: number;
  nomeMes: string;
  siglaMes: string;
  metaValor: number;
  realizadoValor: number;
  diferenca: number;
  variacaoPercentual: number; // ((realizado / meta) - 1) * 100
  atingimentoPercentual: number; // (realizado / meta) * 100
  isHit: boolean;
  hasSales: boolean;
}

export interface YearGoalsSummary {
  ano: number;
  metaTotal: number;
  realizadoTotal: number;
  diferencaTotal: number;
  taxaVariacaoTotal: number;
  atingimentoTotal: number;
  isHit: boolean;
  mesesBatidos: number;
  mesesComVenda: number;
}

export interface GoalsComparisonData {
  anoSelecionado: number;
  tipoMeta: GoalType;
  months: MonthlyGoalComparisonItem[];
  summaryAno: YearGoalsSummary;
  historicoAnual: YearGoalsSummary[];
  availableYears: number[];
}

// ── Metas Históricas das Planilhas (Sobral e Itapipoca) ───────────────────────────
const HISTORICAL_GOALS: Record<
  "sobral" | "itapipoca",
  Record<
    number,
    {
      esperado: Record<number, number>;
      minima: Record<number, number>;
      top1: Record<number, number>;
      top2: Record<number, number>;
      master: Record<number, number>;
    }
  >
> = {
  sobral: {
    2023: {
      esperado: { 1: 65000, 2: 65000, 3: 110000, 4: 110000, 5: 75000, 6: 120000, 7: 95000, 8: 95000, 9: 115000, 10: 140000, 11: 220000, 12: 270000 },
      minima: { 1: 50000, 2: 50000, 3: 80000, 4: 80000, 5: 60000, 6: 90000, 7: 70000, 8: 70000, 9: 80000, 10: 100000, 11: 150000, 12: 180000 },
      top1: { 1: 60000, 2: 60000, 3: 100000, 4: 100000, 5: 70000, 6: 110000, 7: 85000, 8: 85000, 9: 100000, 10: 120000, 11: 180000, 12: 220000 },
      top2: { 1: 70000, 2: 70000, 3: 120000, 4: 120000, 5: 80000, 6: 130000, 7: 100000, 8: 100000, 9: 120000, 10: 140000, 11: 210000, 12: 260000 },
      master: { 1: 80000, 2: 80000, 3: 140000, 4: 140000, 5: 90000, 6: 150000, 7: 115000, 8: 115000, 9: 135000, 10: 160000, 11: 240000, 12: 300000 },
    },
    2024: {
      esperado: { 1: 69665, 2: 66339.9, 3: 112868.2, 4: 110771, 5: 76196, 6: 124891, 7: 97317.4, 8: 95136, 9: 116125, 10: 144644.1, 11: 228425.88, 12: 278369.22 },
      minima: { 1: 60000, 2: 60000, 3: 90000, 4: 90000, 5: 70000, 6: 100000, 7: 80000, 8: 80000, 9: 90000, 10: 120000, 11: 160000, 12: 200000 },
      top1: { 1: 70000, 2: 70000, 3: 110000, 4: 110000, 5: 80000, 6: 120000, 7: 95000, 8: 95000, 9: 110000, 10: 140000, 11: 190000, 12: 240000 },
      top2: { 1: 80000, 2: 80000, 3: 130000, 4: 130000, 5: 90000, 6: 140000, 7: 110000, 8: 110000, 9: 125000, 10: 160000, 11: 220000, 12: 280000 },
      master: { 1: 90000, 2: 90000, 3: 150000, 4: 150000, 5: 100000, 6: 160000, 7: 125000, 8: 125000, 9: 145000, 10: 180000, 11: 250000, 12: 320000 },
    },
    2025: {
      esperado: { 1: 67691.28, 2: 142949.892, 3: 182600.34, 4: 103615.2, 5: 210015.576, 6: 181571.88, 7: 319317.96, 8: 226241.76, 9: 170720.04, 10: 180000, 11: 223167.65, 12: 328522.92 },
      minima: { 1: 70000, 2: 90000, 3: 110000, 4: 100000, 5: 120000, 6: 140000, 7: 80000, 8: 120000, 9: 80000, 10: 100000, 11: 110000, 12: 150000 },
      top1: { 1: 80000, 2: 110000, 3: 140000, 4: 130000, 5: 150000, 6: 170000, 7: 90000, 8: 140000, 9: 100000, 10: 120000, 11: 140000, 12: 200000 },
      top2: { 1: 100000, 2: 130000, 3: 170000, 4: 160000, 5: 180000, 6: 200000, 7: 100000, 8: 160000, 9: 120000, 10: 140000, 11: 170000, 12: 250000 },
      master: { 1: 120000, 2: 150000, 3: 200000, 4: 180000, 5: 210000, 6: 230000, 7: 110000, 8: 180000, 9: 140000, 10: 160000, 11: 200000, 12: 300000 },
    },
    2026: {
      esperado: { 1: 96627.7, 2: 155757.55, 3: 200000, 4: 155351.3, 5: 225358.9, 6: 218842.61, 7: 242106.93, 8: 201230.9, 9: 317030.78, 10: 214267.3, 11: 395781.88, 12: 505802.7 },
      minima: { 1: 80000, 2: 90000, 3: 110000, 4: 100000, 5: 140000, 6: 140000, 7: 140000, 8: 110000, 9: 80000, 10: 100000, 11: 120000, 12: 160000 },
      top1: { 1: 100000, 2: 110000, 3: 130000, 4: 130000, 5: 170000, 6: 170000, 7: 170000, 8: 140000, 9: 100000, 10: 120000, 11: 150000, 12: 210000 },
      top2: { 1: 120000, 2: 130000, 3: 150000, 4: 160000, 5: 200000, 6: 200000, 7: 200000, 8: 170000, 9: 120000, 10: 140000, 11: 180000, 12: 260000 },
      master: { 1: 140000, 2: 150000, 3: 200000, 4: 180000, 5: 230000, 6: 230000, 7: 230000, 8: 200000, 9: 140000, 10: 160000, 11: 220000, 12: 320000 },
    },
  },
  itapipoca: {
    2023: {
      esperado: { 1: 20000, 2: 15000, 3: 30000, 4: 25000, 5: 60000, 6: 40000, 7: 35000, 8: 40000, 9: 35000, 10: 32000, 11: 65000, 12: 90000 },
      minima: { 1: 15000, 2: 12000, 3: 22000, 4: 20000, 5: 45000, 6: 30000, 7: 25000, 8: 30000, 9: 25000, 10: 25000, 11: 50000, 12: 70000 },
      top1: { 1: 18000, 2: 15000, 3: 28000, 4: 24000, 5: 55000, 6: 38000, 7: 32000, 8: 38000, 9: 32000, 10: 30000, 11: 60000, 12: 85000 },
      top2: { 1: 22000, 2: 18000, 3: 34000, 4: 30000, 6: 45000, 5: 65000, 7: 38000, 8: 45000, 9: 38000, 10: 36000, 11: 70000, 12: 100000 },
      master: { 1: 26000, 2: 22000, 3: 40000, 4: 35000, 5: 80000, 6: 55000, 7: 45000, 8: 55000, 9: 45000, 10: 42000, 11: 85000, 12: 120000 },
    },
    2024: {
      esperado: { 1: 19874, 2: 14184.94, 3: 31306.95, 4: 24315, 5: 61782.5, 6: 42011, 7: 33355, 8: 41895, 9: 33729.1, 10: 32190, 11: 66009, 12: 93436 },
      minima: { 1: 16000, 2: 18000, 3: 35000, 4: 45000, 5: 50000, 6: 40000, 7: 50000, 8: 40000, 9: 35000, 10: 30000, 11: 50000, 12: 80000 },
      top1: { 1: 20000, 2: 24000, 3: 45000, 4: 55000, 5: 65000, 6: 50000, 7: 65000, 8: 50000, 9: 42000, 10: 38000, 11: 65000, 12: 100000 },
      top2: { 1: 24000, 2: 28000, 3: 55000, 4: 65000, 5: 75000, 6: 60000, 7: 75000, 8: 60000, 9: 50000, 10: 45000, 11: 75000, 12: 120000 },
      master: { 1: 28000, 2: 32000, 3: 65000, 4: 75000, 5: 90000, 6: 70000, 7: 90000, 8: 70000, 9: 60000, 10: 55000, 11: 90000, 12: 140000 },
    },
    2025: {
      esperado: { 1: 22233.6, 2: 30790.44, 3: 58290.72, 4: 79689.48, 5: 81620.28, 6: 64520.28, 7: 92031.6, 8: 66258.6, 9: 52073.52, 10: 36955.2, 11: 82946.64, 12: 130033.92 },
      minima: { 1: 18000, 2: 25000, 3: 30000, 4: 40000, 5: 60000, 6: 30000, 7: 40000, 8: 40000, 9: 30000, 10: 30000, 11: 30000, 12: 50000 },
      top1: { 1: 22000, 2: 35000, 3: 50000, 4: 50000, 5: 90000, 6: 50000, 7: 60000, 8: 60000, 9: 50000, 10: 40000, 11: 50000, 12: 80000 },
      top2: { 1: 26000, 2: 45000, 3: 70000, 4: 60000, 5: 120000, 6: 70000, 7: 80000, 8: 80000, 9: 70000, 10: 50000, 11: 70000, 12: 130000 },
      master: { 1: 30000, 2: 50000, 3: 90000, 4: 80000, 5: 150000, 6: 90000, 7: 110000, 8: 110000, 9: 90000, 10: 70000, 11: 90000, 12: 180000 },
    },
    2026: {
      esperado: { 1: 25766, 2: 45912.1, 3: 49987.47, 4: 107214.77, 5: 149992.18, 6: 81203.2, 7: 132219.62, 8: 99540.48, 9: 142526.41, 10: 100482.2, 11: 260870.74, 12: 279944.64 },
      minima: { 1: 25000, 2: 35000, 3: 45000, 4: 50000, 5: 60000, 6: 60000, 7: 40000, 8: 40000, 9: 30000, 10: 40000, 11: 60000, 12: 80000 },
      top1: { 1: 30000, 2: 45000, 3: 55000, 4: 65000, 5: 90000, 6: 90000, 7: 60000, 8: 60000, 9: 40000, 10: 50000, 11: 80000, 12: 110000 },
      top2: { 1: 35000, 2: 55000, 3: 70000, 4: 80000, 5: 120000, 6: 120000, 7: 80000, 8: 80000, 9: 50000, 10: 65000, 11: 100000, 12: 140000 },
      master: { 1: 40000, 2: 65000, 3: 90000, 4: 100000, 5: 150000, 6: 150000, 7: 110000, 8: 110000, 9: 60000, 10: 80000, 11: 120000, 12: 180000 },
    },
  },
};

const STORE_CLIENT_IDS: Record<string, string | string[]> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  consolidado: [
    "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
    "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
  ],
};

function getGoalForMonth(
  store: "sobral" | "itapipoca" | "consolidado",
  year: number,
  month: number,
  type: GoalType
): number {
  if (store === "sobral" || store === "itapipoca") {
    const sGoals = HISTORICAL_GOALS[store]?.[year];
    if (sGoals && sGoals[type]) {
      return sGoals[type][month] || 0;
    }
    return 0;
  }

  // Consolidado: soma Sobral + Itapipoca
  const sobralGoal = HISTORICAL_GOALS.sobral?.[year]?.[type]?.[month] || 0;
  const itapGoal = HISTORICAL_GOALS.itapipoca?.[year]?.[type]?.[month] || 0;
  return sobralGoal + itapGoal;
}

async function fetchRealizedRevenue(
  store: "sobral" | "itapipoca" | "consolidado",
  year: number
): Promise<Record<number, number>> {
  const totals: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
  };

  if (year <= 2025) {
    let query = supabase
      .from("marialima_faturamento_historico")
      .select("mes, loja, total_vendas")
      .eq("ano", year);

    if (store === "sobral" || store === "itapipoca") {
      query = query.eq("loja", store);
    }

    const { data } = await query;
    (data || []).forEach((row: any) => {
      const m = Number(row.mes);
      const val = Number(row.total_vendas) || 0;
      if (m >= 1 && m <= 12) {
        totals[m] = (totals[m] || 0) + val;
      }
    });

    return totals;
  }

  // 2026+: busca em tempo real
  const targetClient = STORE_CLIENT_IDS[store];
  if (!targetClient) return totals;

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

  const { data } = await query;
  (data || []).forEach((row: any) => {
    if (row.data_venda) {
      const parts = row.data_venda.split("-");
      if (parts.length >= 2) {
        const monthNum = parseInt(parts[1], 10);
        const val = Number(row.valor_total) || 0;
        if (monthNum >= 1 && monthNum <= 12) {
          totals[monthNum] = (totals[monthNum] || 0) + val;
        }
      }
    }
  });

  return totals;
}

export function useGoalsComparison(
  store: "sobral" | "itapipoca" | "consolidado" = "sobral",
  selectedYear: number = 2026,
  goalType: GoalType = "esperado"
) {
  return useQuery({
    queryKey: ["goals-comparison", store, selectedYear, goalType],
    queryFn: async (): Promise<GoalsComparisonData> => {
      const availableYears = [2026, 2025, 2024, 2023];

      // Busca dados realizados para todos os anos em paralelo
      const realizedMapByYear: Record<number, Record<number, number>> = {};
      await Promise.all(
        availableYears.map(async (y) => {
          realizedMapByYear[y] = await fetchRealizedRevenue(store, y);
        })
      );

      // Constrói meses do ano selecionado
      const curRealized = realizedMapByYear[selectedYear] || {};
      const months: MonthlyGoalComparisonItem[] = [];

      let metaTotal = 0;
      let realizadoTotal = 0;
      let mesesBatidos = 0;
      let mesesComVenda = 0;

      for (let m = 1; m <= 12; m++) {
        const metaVal = getGoalForMonth(store, selectedYear, m, goalType);
        const realVal = curRealized[m] || 0;
        const diff = realVal - metaVal;
        const variacao = metaVal > 0 ? ((realVal / metaVal) - 1) * 100 : 0;
        const atingimento = metaVal > 0 ? (realVal / metaVal) * 100 : 0;
        const isHit = diff >= 0 && realVal > 0;
        const hasSales = realVal > 0;

        metaTotal += metaVal;
        realizadoTotal += realVal;
        if (isHit) mesesBatidos++;
        if (hasSales) mesesComVenda++;

        months.push({
          mes: m,
          nomeMes: MONTH_NAMES[m - 1],
          siglaMes: MONTH_SHORT_NAMES[m - 1],
          metaValor: metaVal,
          realizadoValor: realVal,
          diferenca: diff,
          variacaoPercentual: variacao,
          atingimentoPercentual: atingimento,
          isHit,
          hasSales,
        });
      }

      const diferencaTotal = realizadoTotal - metaTotal;
      const taxaVariacaoTotal = metaTotal > 0 ? ((realizadoTotal / metaTotal) - 1) * 100 : 0;
      const atingimentoTotal = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;

      const summaryAno: YearGoalsSummary = {
        ano: selectedYear,
        metaTotal,
        realizadoTotal,
        diferencaTotal,
        taxaVariacaoTotal,
        atingimentoTotal,
        isHit: diferencaTotal >= 0,
        mesesBatidos,
        mesesComVenda,
      };

      // Panorama Multianual (2023 a 2026)
      const historicoAnual: YearGoalsSummary[] = availableYears.map((y) => {
        const yRealized = realizedMapByYear[y] || {};
        let yMetaTot = 0;
        let yRealTot = 0;
        let yHits = 0;
        let ySalesCount = 0;

        for (let m = 1; m <= 12; m++) {
          const mGoal = getGoalForMonth(store, y, m, goalType);
          const mReal = yRealized[m] || 0;
          yMetaTot += mGoal;
          yRealTot += mReal;
          if (mReal >= mGoal && mReal > 0) yHits++;
          if (mReal > 0) ySalesCount++;
        }

        const yDiff = yRealTot - yMetaTot;
        const yVar = yMetaTot > 0 ? ((yRealTot / yMetaTot) - 1) * 100 : 0;
        const yAtg = yMetaTot > 0 ? (yRealTot / yMetaTot) * 100 : 0;

        return {
          ano: y,
          metaTotal: yMetaTot,
          realizadoTotal: yRealTot,
          diferencaTotal: yDiff,
          taxaVariacaoTotal: yVar,
          atingimentoTotal: yAtg,
          isHit: yDiff >= 0,
          mesesBatidos: yHits,
          mesesComVenda: ySalesCount,
        };
      });

      return {
        anoSelecionado: selectedYear,
        tipoMeta: goalType,
        months,
        summaryAno,
        historicoAnual,
        availableYears,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
