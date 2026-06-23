import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";

export type GoalDistributionMode = "uniform" | "day" | "week";

export interface MonthlyGoal {
  id: string;
  year_month: string;
  store: string;
  meta_minima: number;
  meta_top1: number;
  meta_top2: number;
  meta_master: number;
  dias_uteis: number;
  distribution_mode?: GoalDistributionMode;
  distribution_percentages?: unknown;
  created_at: string;
}

const FALLBACK_GOALS: Pick<MonthlyGoal, "meta_minima" | "meta_top1" | "meta_top2" | "meta_master" | "dias_uteis" | "distribution_mode" | "distribution_percentages"> = {
  meta_minima: 90000,
  meta_top1: 110000,
  meta_top2: 130000,
  meta_master: 150000,
  dias_uteis: 24,
  distribution_mode: "uniform",
  distribution_percentages: null,
};

async function fetchAllGoals(store: string): Promise<MonthlyGoal[]> {
  const { data, error } = await supabase
    .from("marialima_monthly_goals")
    .select("*")
    .eq("store", store)
    .order("year_month", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as MonthlyGoal[];
}

export function useMonthlyGoals(store = "sobral") {
  return useQuery({
    queryKey: ["monthly-goals", store],
    queryFn: () => fetchAllGoals(store),
  });
}

export function useCurrentMonthGoals(store = "sobral", targetYearMonth?: string) {
  const now = new Date();
  const { year, month } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const currentYearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const yearMonth = targetYearMonth || currentYearMonth;

  return useQuery({
    queryKey: ["monthly-goals", store, yearMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marialima_monthly_goals")
        .select("*")
        .eq("year_month", yearMonth)
        .eq("store", store)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return {
          id: yearMonth,
          year_month: yearMonth,
          store,
          created_at: new Date().toISOString(),
          ...FALLBACK_GOALS,
        } as MonthlyGoal;
      }
      return data as MonthlyGoal;
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Omit<MonthlyGoal, "id" | "created_at">) => {
      const { error } = await supabase.rpc("marialima_upsert_monthly_goal", {
        p_year_month: goal.year_month,
        p_store: goal.store ?? "sobral",
        p_meta_minima: goal.meta_minima,
        p_meta_top1: goal.meta_top1,
        p_meta_top2: goal.meta_top2,
        p_meta_master: goal.meta_master,
        p_dias_uteis: goal.dias_uteis,
        p_distribution_mode: goal.distribution_mode ?? "uniform",
        p_distribution_percentages: goal.distribution_mode && goal.distribution_mode !== "uniform" ? (goal.distribution_percentages ?? null) : null,
      });
      if (error) throw new Error(error.message);
      return goal;
    },
    onSuccess: (goal) => {
      qc.invalidateQueries({ queryKey: ["monthly-goals", goal.store ?? "sobral"] });
    },
  });
}
