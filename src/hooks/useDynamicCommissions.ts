import { useMemo } from "react";
import type { RankingItem } from "./useSalesData";
import { useVendedoresConfig } from "./useVendedoresConfig";
import { isSellerMatch } from "./usePAAnalysis";

export interface CommissionConfig {
  minima: number;
  top1: number;
  top2: number;
  master: number;
}

export const DEFAULT_COMMISSION_CONFIG: CommissionConfig = {
  minima: 0.01,   // 1%
  top1: 0.013,    // 1.3%
  top2: 0.015,    // 1.5%
  master: 0.02,   // 2%
};

export function useDynamicCommissions(
  ranking: RankingItem[],
  goalData: any, // data from useCurrentMonthGoals
  useDynamic: boolean
) {
  const { data: configs } = useVendedoresConfig();

  return useMemo(() => {
    if (!useDynamic || !goalData || ranking.length === 0) {
      return ranking;
    }

    // Calcula os pesos dos vendedores
    const sellerWithWeights = ranking.map((seller) => {
      const cfg = configs?.find((c) => isSellerMatch(c.nome_vendedor, seller.vendedor));
      const peso = cfg?.peso_meta !== undefined && cfg?.peso_meta !== null ? Number(cfg.peso_meta) : 1;
      return { seller, peso };
    });

    const totalWeight = sellerWithWeights.reduce((sum, item) => sum + item.peso, 0);

    const metaMinimaLoja = goalData.meta_minima ?? 40000;
    const metaTop1Loja = goalData.meta_top1 ?? 60000;
    const metaTop2Loja = goalData.meta_top2 ?? 80000;
    const metaMasterLoja = goalData.meta_master ?? 150000;

    return sellerWithWeights.map(({ seller, peso }) => {
      // Vendedores com peso 0 não recebem meta nem comissão dinâmica baseada em meta
      if (peso <= 0) {
        return {
          ...seller,
          comissao: 0,
        };
      }

      const ratio = totalWeight > 0 ? peso / totalWeight : 1 / Math.max(ranking.length, 1);
      const metaMinima = metaMinimaLoja * ratio;
      const metaTop1 = metaTop1Loja * ratio;
      const metaTop2 = metaTop2Loja * ratio;
      const metaMaster = metaMasterLoja * ratio;

      let percent = 0;
      if (seller.total >= metaMaster) percent = DEFAULT_COMMISSION_CONFIG.master;
      else if (seller.total >= metaTop2) percent = DEFAULT_COMMISSION_CONFIG.top2;
      else if (seller.total >= metaTop1) percent = DEFAULT_COMMISSION_CONFIG.top1;
      else if (seller.total >= metaMinima) percent = DEFAULT_COMMISSION_CONFIG.minima;

      return {
        ...seller,
        comissao: seller.total * percent,
      };
    });
  }, [ranking, goalData, useDynamic, configs]);
}

export function calculateSingleDynamicCommission(
  totalSales: number,
  sellerCount: number,
  goalData: any,
  sellerRatio?: number,
  sellerWeight?: number
): number {
  if (!goalData) return 0;
  if (sellerWeight !== undefined && sellerWeight <= 0) return 0;
  
  const ratio = sellerRatio !== undefined ? sellerRatio : (sellerCount > 0 ? 1 / sellerCount : 1);
  const metaMinima = (goalData.meta_minima ?? 40000) * ratio;
  const metaTop1 = (goalData.meta_top1 ?? 60000) * ratio;
  const metaTop2 = (goalData.meta_top2 ?? 80000) * ratio;
  const metaMaster = (goalData.meta_master ?? 150000) * ratio;

  let percent = 0;
  if (totalSales >= metaMaster) percent = DEFAULT_COMMISSION_CONFIG.master;
  else if (totalSales >= metaTop2) percent = DEFAULT_COMMISSION_CONFIG.top2;
  else if (totalSales >= metaTop1) percent = DEFAULT_COMMISSION_CONFIG.top1;
  else if (totalSales >= metaMinima) percent = DEFAULT_COMMISSION_CONFIG.minima;

  return totalSales * percent;
}
