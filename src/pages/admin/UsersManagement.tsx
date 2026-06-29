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
import { Plus, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendedoresInfo } from "@/hooks/useVendedoresConfig";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  nome_vendedor?: string | null;
  loja?: string | null;
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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", full_name: "", role: "seller", nome_vendedor: "", loja: "" });
  const { data: sellersInfo } = useVendedoresInfo();

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
      
      // Update profile with seller info if role is seller
      if (newUser.role === "seller" && newUser.nome_vendedor) {
        const { error: profileError } = await (supabase as any)
          .from("marialima_profiles")
          .update({
            nome_vendedor: newUser.nome_vendedor,
            loja: newUser.loja || null,
          })
          .eq("id", data.user.id);
        if (profileError) console.error("Error linking seller to profile:", profileError);
      }
      
      return data.user;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setOpenNew(false);
      setNewUser({ username: "", email: "", password: "", full_name: "", role: "seller", nome_vendedor: "", loja: "" });
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
    <div className="h-full w-full overflow-y-auto overflow-x-hidden space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Gestão de Usuários</h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie usuários e suas permissões</p>
          </div>
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

              {newUser.role === "seller" && (
                <div className="grid grid-cols-2 gap-4 border border-border/60 p-4 rounded-lg bg-secondary/20">
                  <div className="space-y-2">
                    <Label>Vendedor (Gigatech)</Label>
                    <Select 
                      value={newUser.nome_vendedor} 
                      onValueChange={(v) => {
                        const sInfo = sellersInfo?.find(s => s.nome_vendedor === v);
                        setNewUser({ ...newUser, nome_vendedor: v, loja: sInfo?.loja || "" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sellersInfo?.map((s) => (
                          <SelectItem key={`${s.nome_vendedor}-${s.loja}`} value={s.nome_vendedor}>
                            {s.nome_vendedor} {s.loja ? `(${s.loja})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Loja</Label>
                    <Input value={newUser.loja} disabled placeholder="Preenchimento automático" />
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border/60 w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
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
                      <td className="px-4 py-2.5 font-medium">
                        {p.username}
                        {p.nome_vendedor && (
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            Vínculo: {p.nome_vendedor} {p.loja ? `(${p.loja})` : ''}
                          </span>
                        )}
                      </td>
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
