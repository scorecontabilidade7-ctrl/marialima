import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Shield } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "manager" | "seller";
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  seller: "Vendedor",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-accent/20 text-accent-foreground",
  seller: "bg-primary/10 text-primary",
};

export default function UsersManagement() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", full_name: "", role: "seller" });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("marialima_profiles").select("*");
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

  const createUser = useMutation({
    mutationFn: async () => {
      // Usa Edge Function com service role para não alterar a sessão atual do admin
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          username: newUser.username,
          email: newUser.email || undefined,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.user;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setOpenNew(false);
      setNewUser({ username: "", email: "", password: "", full_name: "", role: "seller" });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao criar usuário", { description: err.message });
    },
  });

  const getUserRoles = (userId: string) => {
    return roles?.filter((r) => r.user_id === userId) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Gestão de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e suas permissões</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createUser.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="usuario"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="Nome Completo"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="usuario@email.com"
                />
                <p className="text-[10px] text-muted-foreground">Se vazio, será usado username@admin.com</p>
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                  <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                  <th className="text-left px-4 py-2.5 font-medium">Funções</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                ) : !profiles?.length ? (
                  <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário</td></tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{p.username}</td>
                      <td className="px-4 py-2.5">{p.full_name || "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          {getUserRoles(p.id).map((r) => (
                            <span
                              key={r.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[r.role]}`}
                            >
                              <Shield className="w-3 h-3" />
                              {ROLE_LABELS[r.role]}
                            </span>
                          ))}
                          {getUserRoles(p.id).length === 0 && (
                            <span className="text-muted-foreground text-xs">Sem função</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
