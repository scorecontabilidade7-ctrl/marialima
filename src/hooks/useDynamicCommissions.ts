import { useMemo } from "react";
import type { RankingItem } from "./useSalesData";

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
  return useMemo(() => {
    if (!useDynamic || !goalData || ranking.length === 0) {
      return ranking;
    }

    const sellerCount = Math.max(ranking.length, 1);
    const metaMinima = (goalData.meta_minima ?? 40000) / sellerCount;
    const metaTop1 = (goalData.meta_top1 ?? 60000) / sellerCount;
    const metaTop2 = (goalData.meta_top2 ?? 80000) / sellerCount;
    const metaMaster = (goalData.meta_master ?? 150000) / sellerCount;

    return ranking.map((seller) => {
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
  }, [ranking, goalData, useDynamic]);
}

export function calculateSingleDynamicCommission(
  totalSales: number,
  sellerCount: number,
  goalData: any
): number {
  if (!goalData || sellerCount <= 0) return 0;
  
  const metaMinima = (goalData.meta_minima ?? 40000) / sellerCount;
  const metaTop1 = (goalData.meta_top1 ?? 60000) / sellerCount;
  const metaTop2 = (goalData.meta_top2 ?? 80000) / sellerCount;
  const metaMaster = (goalData.meta_master ?? 150000) / sellerCount;

  let percent = 0;
  if (totalSales >= metaMaster) percent = DEFAULT_COMMISSION_CONFIG.master;
  else if (totalSales >= metaTop2) percent = DEFAULT_COMMISSION_CONFIG.top2;
  else if (totalSales >= metaTop1) percent = DEFAULT_COMMISSION_CONFIG.top1;
  else if (totalSales >= metaMinima) percent = DEFAULT_COMMISSION_CONFIG.minima;

  return totalSales * percent;
}
