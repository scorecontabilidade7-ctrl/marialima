import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendedorConfig {
  id: string;
  nome_vendedor: string;
  url_foto: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useVendedoresConfig() {
  return useQuery({
    queryKey: ["vendedoresConfig"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marialima_vendedores_config")
        .select("*")
        .order("nome_vendedor");
      
      if (error) throw error;
      return data as VendedorConfig[];
    },
  });
}

export function useDistinctVendedores() {
  return useQuery({
    queryKey: ["distinctVendedores"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("marialima_get_distinct_vendedores");
      if (error) throw error;
      return data as string[];
    },
  });
}

export function useUpsertVendedorConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: { id?: string; nome_vendedor: string; url_foto: string | null }) => {
      if (config.id) {
        const { data, error } = await supabase
          .from("marialima_vendedores_config")
          .update({
            nome_vendedor: config.nome_vendedor,
            url_foto: config.url_foto,
            updated_at: new Date().toISOString()
          })
          .eq("id", config.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("marialima_vendedores_config")
          .insert({
            nome_vendedor: config.nome_vendedor,
            url_foto: config.url_foto
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendedoresConfig"] });
      // Invalidate dashboard data to refresh photos immediately
      queryClient.invalidateQueries({ queryKey: ["dashboard_data"] });
    },
  });
}

export async function uploadSellerPhoto(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from("marialima_vendedores")
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("marialima_vendedores")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
