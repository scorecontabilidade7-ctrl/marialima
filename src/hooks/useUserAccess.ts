import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Store = "sobral" | "itapipoca";

export const ALL_STORES: Store[] = ["sobral", "itapipoca"];

export const STORE_LABELS: Record<Store, string> = {
  sobral: "Sobral",
  itapipoca: "Itapipoca",
};

export function useUserAccess() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [] as string[];
      const { data, error } = await (supabase as any)
        .from("marialima_user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((r: any) => r.role as string);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = roles?.includes("admin") ?? false;

  const { data: storeRows, isLoading: storesLoading } = useQuery({
    queryKey: ["user-stores", userId],
    queryFn: async () => {
      if (!userId) return [] as Store[];
      const { data, error } = await (supabase as any)
        .from("marialima_user_stores")
        .select("store")
        .eq("user_id", userId);
      if (error) return [] as Store[]; // fail-closed: sem acesso em caso de erro
      return (data || []).map((r: any) => r.store as Store);
    },
    enabled: !!userId && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const accessibleStores: Store[] = isAdmin ? ALL_STORES : (storeRows ?? ALL_STORES);

  const loading = authLoading || rolesLoading || (!isAdmin && storesLoading);

  return {
    isAdmin,
    accessibleStores,
    hasStoreAccess: (store: Store) => isAdmin || accessibleStores.includes(store),
    loading,
  };
}
