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

const STORE_CLIENT_IDS: Record<string, string> = {
  sobral: "94759cb2-e37b-4b67-8f77-fb7ab251fff9",
  itapipoca: "567b7f9b-fbbb-4fda-8a2c-4c8fd99b9d72",
};

async function fetchSingleStoreGoal(store: string, yearMonth: string): Promise<MonthlyGoal | null> {
  const clienteId = STORE_CLIENT_IDS[store];

  // 1. Tentar buscar primeiro na tabela multi_monthly_goals
  if (clienteId) {
    try {
      const { data: multiGoal } = await supabase
        .from("multi_monthly_goals")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("year_month", yearMonth)
        .maybeSingle();

      if (multiGoal) {
        // Buscar os valores parametrizados
        const { data: valores } = await supabase
          .from("multi_monthly_goals_valores")
          .select("valor, parametro_meta_id, multi_parametro_metas(nome, ordem)")
          .eq("monthly_goal_id", multiGoal.id);

        let meta_minima = 0;
        let meta_top1 = 0;
        let meta_top2 = 0;
        let meta_master = 0;

        (valores || []).forEach((v: any) => {
          const val = Number(v.valor) || 0;
          const nome = (v.multi_parametro_metas?.nome || "").toLowerCase();
          const ordem = v.multi_parametro_metas?.ordem;

          if (ordem === 1 || nome.includes("mínima") || nome.includes("minima")) meta_minima = val;
          else if (ordem === 2 || nome.includes("top 1") || nome.includes("top1")) meta_top1 = val;
          else if (ordem === 3 || nome.includes("top 2") || nome.includes("top2")) meta_top2 = val;
          else if (ordem === 4 || nome.includes("master")) meta_master = val;
        });

        const distMode = (multiGoal.distribution_mode as GoalDistributionMode) || "uniform";
        let distPerc: unknown = null;
        if (distMode === "week" && Array.isArray(multiGoal.distribution_week) && multiGoal.distribution_week.length > 0) {
          distPerc = multiGoal.distribution_week.map(Number);
        } else if (distMode === "day" && Array.isArray(multiGoal.distribution_day) && multiGoal.distribution_day.length > 0) {
          distPerc = multiGoal.distribution_day.map(Number);
        }

        if (meta_minima > 0 || meta_top1 > 0 || meta_top2 > 0 || meta_master > 0) {
          return {
            id: multiGoal.id,
            year_month: yearMonth,
            store,
            meta_minima: meta_minima || FALLBACK_GOALS.meta_minima,
            meta_top1: meta_top1 || FALLBACK_GOALS.meta_top1,
            meta_top2: meta_top2 || FALLBACK_GOALS.meta_top2,
            meta_master: meta_master || FALLBACK_GOALS.meta_master,
            dias_uteis: Number(multiGoal.dias_uteis) || FALLBACK_GOALS.dias_uteis,
            distribution_mode: distMode,
            distribution_percentages: distPerc,
            created_at: multiGoal.created_at || new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar multi_monthly_goals:", e);
    }
  }

  // 2. Fallback na tabela marialima_monthly_goals
  const { data, error } = await supabase
    .from("marialima_monthly_goals")
    .select("*")
    .eq("year_month", yearMonth)
    .eq("store", store)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as MonthlyGoal) : null;
}

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
      if (store === "consolidado") {
        const sobral = await fetchSingleStoreGoal("sobral", yearMonth);
        const itapipoca = await fetchSingleStoreGoal("itapipoca", yearMonth);

        const sMinima = sobral?.meta_minima ?? FALLBACK_GOALS.meta_minima;
        const iMinima = itapipoca?.meta_minima ?? FALLBACK_GOALS.meta_minima;

        const sTop1 = sobral?.meta_top1 ?? FALLBACK_GOALS.meta_top1;
        const iTop1 = itapipoca?.meta_top1 ?? FALLBACK_GOALS.meta_top1;

        const sTop2 = sobral?.meta_top2 ?? FALLBACK_GOALS.meta_top2;
        const iTop2 = itapipoca?.meta_top2 ?? FALLBACK_GOALS.meta_top2;

        const sMaster = sobral?.meta_master ?? FALLBACK_GOALS.meta_master;
        const iMaster = itapipoca?.meta_master ?? FALLBACK_GOALS.meta_master;

        const diasUteis = Math.max(sobral?.dias_uteis ?? 20, itapipoca?.dias_uteis ?? 20);

        return {
          id: yearMonth,
          year_month: yearMonth,
          store: "consolidado",
          meta_minima: sMinima + iMinima,
          meta_top1: sTop1 + iTop1,
          meta_top2: sTop2 + iTop2,
          meta_master: sMaster + iMaster,
          dias_uteis: diasUteis,
          distribution_mode: sobral?.distribution_mode || "uniform",
          distribution_percentages: null,
          created_at: new Date().toISOString(),
        } as MonthlyGoal;
      }

      const goal = await fetchSingleStoreGoal(store, yearMonth);
      if (!goal) {
        return {
          id: yearMonth,
          year_month: yearMonth,
          store,
          created_at: new Date().toISOString(),
          ...FALLBACK_GOALS,
        } as MonthlyGoal;
      }
      return goal;
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: Omit<MonthlyGoal, "id" | "created_at">) => {
      // 1. Upsert na tabela marialima_monthly_goals
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

      // 2. Sincronizar na tabela multi_monthly_goals se houver cliente_id correspondente
      const clienteId = STORE_CLIENT_IDS[goal.store ?? "sobral"];
      if (clienteId) {
        try {
          // Buscar ou criar o registro em multi_monthly_goals
          const { data: existingMg } = await supabase
            .from("multi_monthly_goals")
            .select("id")
            .eq("cliente_id", clienteId)
            .eq("year_month", goal.year_month)
            .maybeSingle();

          let mgId = existingMg?.id;
          const distWeek = goal.distribution_mode === "week" && Array.isArray(goal.distribution_percentages) ? goal.distribution_percentages : [];
          const distDay = goal.distribution_mode === "day" && Array.isArray(goal.distribution_percentages) ? goal.distribution_percentages : [];

          if (mgId) {
            await supabase
              .from("multi_monthly_goals")
              .update({
                dias_uteis: goal.dias_uteis,
                distribution_mode: goal.distribution_mode ?? "uniform",
                distribution_week: distWeek,
                distribution_day: distDay,
              })
              .eq("id", mgId);
          } else {
            const { data: newMg } = await supabase
              .from("multi_monthly_goals")
              .insert({
                cliente_id: clienteId,
                year_month: goal.year_month,
                dias_uteis: goal.dias_uteis,
                distribution_mode: goal.distribution_mode ?? "uniform",
                distribution_week: distWeek,
                distribution_day: distDay,
              })
              .select("id")
              .single();
            mgId = newMg?.id;
          }

          if (mgId) {
            // Sincronizar parâmetros de metas
            const { data: params } = await supabase
              .from("multi_parametro_metas")
              .select("id, nome, ordem")
              .eq("cliente_id", clienteId);

            if (params && params.length > 0) {
              const metaMap: Record<number, number> = {
                1: goal.meta_minima,
                2: goal.meta_top1,
                3: goal.meta_top2,
                4: goal.meta_master,
              };

              for (const p of params) {
                const val = metaMap[p.ordem];
                if (val !== undefined) {
                  const { data: existingVal } = await supabase
                    .from("multi_monthly_goals_valores")
                    .select("id")
                    .eq("monthly_goal_id", mgId)
                    .eq("parametro_meta_id", p.id)
                    .maybeSingle();

                  if (existingVal) {
                    await supabase
                      .from("multi_monthly_goals_valores")
                      .update({ valor: val })
                      .eq("id", existingVal.id);
                  } else {
                    await supabase
                      .from("multi_monthly_goals_valores")
                      .insert({
                        monthly_goal_id: mgId,
                        parametro_meta_id: p.id,
                        valor: val,
                      });
                  }
                }
              }
            }
          }
        } catch (syncErr) {
          console.warn("Erro ao sincronizar multi_monthly_goals:", syncErr);
        }
      }

      return goal;
    },
    onSuccess: (goal) => {
      qc.invalidateQueries({ queryKey: ["monthly-goals"] });
    },
  });
}
