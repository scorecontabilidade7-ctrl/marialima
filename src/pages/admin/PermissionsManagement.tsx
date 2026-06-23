import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_STORES, STORE_LABELS, type Store as StoreType } from "@/hooks/useUserAccess";

type Role = "admin" | "manager" | "seller";

interface Profile { id: string; username: string; full_name: string; }
interface UserRole { id: string; user_id: string; role: Role; }
interface UserStore { id: string; user_id: string; store: StoreType; }

const ROLES: Role[] = ["admin", "manager", "seller"];
const ROLE_LABELS: Record<Role, string> = { admin: "Admin", manager: "Gerente", seller: "Vendedor" };
const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  manager: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  seller: "bg-primary/10 text-primary border-primary/20",
};

export default function PermissionsManagement() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addingRole, setAddingRole] = useState<Record<string, Role>>({});

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marialima_profiles").select("id, username, full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marialima_user_roles").select("*");
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: userStores } = useQuery({
    queryKey: ["admin-user-stores"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marialima_user_stores").select("*");
      if (error) throw error;
      return data as UserStore[];
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await (supabase as any).from("marialima_user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      toast.success("Papel adicionado");
      setAddingRole((prev) => { const s = { ...prev }; delete s[userId]; return s; });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: any) => toast.error("Erro ao adicionar papel", { description: err.message }),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await (supabase as any).from("marialima_user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Papel removido");
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: any) => toast.error("Erro ao remover papel", { description: err.message }),
  });

  const addStoreAccess = useMutation({
    mutationFn: async ({ userId, store }: { userId: string; store: StoreType }) => {
      const { error } = await (supabase as any).from("marialima_user_stores").insert({ user_id: userId, store });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso concedido");
      qc.invalidateQueries({ queryKey: ["admin-user-stores"] });
      qc.invalidateQueries({ queryKey: ["user-stores"] });
    },
    onError: (err: any) => toast.error("Erro ao conceder acesso", { description: err.message }),
  });

  const removeStoreAccess = useMutation({
    mutationFn: async (storeRowId: string) => {
      const { error } = await (supabase as any).from("marialima_user_stores").delete().eq("id", storeRowId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso removido");
      qc.invalidateQueries({ queryKey: ["admin-user-stores"] });
      qc.invalidateQueries({ queryKey: ["user-stores"] });
    },
    onError: (err: any) => toast.error("Erro ao remover acesso", { description: err.message }),
  });

  const getUserRoles = (uid: string) => roles?.filter((r) => r.user_id === uid) ?? [];
  const isUserAdmin  = (uid: string) => getUserRoles(uid).some((r) => r.role === "admin");
  const availableRoles = (uid: string) => ROLES.filter((r) => !getUserRoles(uid).map((x) => x.role).includes(r));
  const getUserStores  = (uid: string) => userStores?.filter((s) => s.user_id === uid) ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Permissões</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie papéis e acesso às lojas por usuário</p>
        </div>
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Usuários
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                  <th className="text-left px-4 py-2.5 font-medium">Papéis</th>
                  <th className="text-left px-4 py-2.5 font-medium">Adicionar papel</th>
                  {ALL_STORES.map((s) => (
                    <th key={s} className="text-center px-4 py-2.5 font-medium">{STORE_LABELS[s]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3 + ALL_STORES.length} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                ) : !profiles?.length ? (
                  <tr><td colSpan={3 + ALL_STORES.length} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
                ) : (
                  profiles.map((p) => {
                    const userRoles   = getUserRoles(p.id);
                    const available   = availableRoles(p.id);
                    const selectedRole = addingRole[p.id];
                    const admin       = isUserAdmin(p.id);

                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30">
                        {/* Usuário */}
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.username}</div>
                          {p.full_name && <div className="text-xs text-muted-foreground">{p.full_name}</div>}
                        </td>

                        {/* Papéis */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {userRoles.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem papel</span>
                            ) : (
                              userRoles.map((r) => (
                                <span key={r.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_COLORS[r.role]}`}>
                                  {ROLE_LABELS[r.role]}
                                  <button onClick={() => removeRole.mutate(r.id)} disabled={removeRole.isPending} className="ml-0.5 opacity-60 hover:opacity-100">
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Adicionar papel */}
                        <td className="px-4 py-3">
                          {available.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Select value={selectedRole ?? ""} onValueChange={(v) => setAddingRole((prev) => ({ ...prev, [p.id]: v as Role }))}>
                                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Papel..." /></SelectTrigger>
                                <SelectContent>
                                  {available.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <Button size="sm" className="h-7 px-2" disabled={!selectedRole || addRole.isPending} onClick={() => { if (selectedRole) addRole.mutate({ userId: p.id, role: selectedRole }); }}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Acesso por loja */}
                        {ALL_STORES.map((store) => {
                          const storeRow = getUserStores(p.id).find((s) => s.store === store);
                          const hasAccess = admin || !!storeRow;
                          return (
                            <td key={store} className="px-4 py-3 text-center">
                              {admin ? (
                                <span className="text-xs text-muted-foreground" title="Admin tem acesso total">—</span>
                              ) : hasAccess ? (
                                <button
                                  onClick={() => storeRow && removeStoreAccess.mutate(storeRow.id)}
                                  disabled={removeStoreAccess.isPending}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                                  title="Clique para revogar"
                                >
                                  ✓ Liberado
                                </button>
                              ) : (
                                <button
                                  onClick={() => addStoreAccess.mutate({ userId: p.id, store })}
                                  disabled={addStoreAccess.isPending}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                                  title="Clique para liberar"
                                >
                                  + Liberar
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
