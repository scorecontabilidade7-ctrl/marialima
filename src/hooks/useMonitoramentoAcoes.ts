import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MonitoramentoAcao {
  id: string;
  store: string;
  name: string;
  start_date: string;
  end_date: string;
  target_value: number;
  realized_value?: number;
}

export function useMonitoramentoAcoes(store: string, year: number, month: number) {
  return useQuery({
    queryKey: ["monitoramento-acoes", store, year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("marialima_get_monitoramento_acoes", {
        p_store: store,
        p_year: year,
        p_month: month,
      });

      if (error) {
        throw new Error(`Erro ao buscar ações: ${error.message}`);
      }

      return (data || []) as MonitoramentoAcao[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMonitoramentoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (acao: Omit<MonitoramentoAcao, "id" | "realized_value">) => {
      const { data, error } = await supabase
        .from("marialima_monitoramento_acoes")
        .insert([acao])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monitoramento-acoes", variables.store] });
      toast.success("Ação cadastrada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar ação: ${error.message}`);
    },
  });
}

export function useUpdateMonitoramentoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (acao: MonitoramentoAcao) => {
      const { id, realized_value, ...updateData } = acao;
      const { data, error } = await supabase
        .from("marialima_monitoramento_acoes")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monitoramento-acoes", variables.store] });
      toast.success("Ação atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar ação: ${error.message}`);
    },
  });
}

export function useDeleteMonitoramentoAcao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, store }: { id: string; store: string }) => {
      const { error } = await supabase
        .from("marialima_monitoramento_acoes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monitoramento-acoes", variables.store] });
      toast.success("Ação apagada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao apagar ação: ${error.message}`);
    },
  });
}
