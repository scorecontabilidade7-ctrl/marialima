import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Shield, ArrowLeft, MoreHorizontal, Edit, PowerOff, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendedoresInfo } from "@/hooks/useVendedoresConfig";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const formatWhatsapp = (val: string) => {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
};

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  nome_vendedor?: string | null;
  avatar_url: string | null;
  nome_vendedor?: string | null;
  loja?: string | null;
  active?: boolean;
  whatsapp?: string | null;
  agente_ia?: boolean;
  tipo_notificacao?: string[];
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
  const [openEdit, setOpenEdit] = useState(false);
  const [newUser, setNewUser] = useState<{ username: string; email: string; password: string; full_name: string; role: string; nome_vendedor: string; loja: string; whatsapp: string; agente_ia: boolean; tipo_notificacao: string[] }>({ username: "", email: "", password: "", full_name: "", role: "seller", nome_vendedor: "", loja: "", whatsapp: "", agente_ia: false, tipo_notificacao: [] });
  const [editingUser, setEditingUser] = useState<{ id: string; email: string; password: string; full_name: string; role: string; nome_vendedor: string; loja: string; active: boolean; whatsapp: string; agente_ia: boolean; tipo_notificacao: string[] } | null>(null);
  const { data: sellersInfo } = useVendedoresInfo();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marialima_profiles")
        .select("*")
        .order("username", { ascending: true });
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
      const updateData: any = {
        whatsapp: newUser.whatsapp || null,
        agente_ia: newUser.agente_ia,
        tipo_notificacao: newUser.tipo_notificacao,
      };
      if (newUser.role === "seller" && newUser.nome_vendedor) {
        updateData.nome_vendedor = newUser.nome_vendedor;
        updateData.loja = newUser.loja || null;
      }
      
      const { error: profileError } = await (supabase as any)
        .from("marialima_profiles")
        .update(updateData)
        .eq("id", data.user.id);
      if (profileError) console.error("Error linking seller to profile:", profileError);
      
      return data.user;
    },
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setOpenNew(false);
      setNewUser({ username: "", email: "", password: "", full_name: "", role: "seller", nome_vendedor: "", loja: "", whatsapp: "", agente_ia: false, tipo_notificacao: [] });
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao criar usuário", { description: err.message });
    },
  });

  const updateUser = useMutation({
    mutationFn: async (vars: { id: string; email?: string; password?: string; full_name?: string; role?: string; active?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: {
          userId: vars.id,
          email: vars.email || undefined,
          password: vars.password || undefined,
          full_name: vars.full_name,
          role: vars.role,
          active: vars.active,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update profile with seller info if role is seller
      if (editingUser && vars.role) {
        const updateData: any = {
          whatsapp: editingUser.whatsapp || null,
          agente_ia: editingUser.agente_ia,
          tipo_notificacao: editingUser.tipo_notificacao,
        };

        if (vars.role === "seller" && editingUser.nome_vendedor) {
          updateData.nome_vendedor = editingUser.nome_vendedor;
          updateData.loja = editingUser.loja || null;
        } else if (vars.role !== "seller") {
          updateData.nome_vendedor = null;
          updateData.loja = null;
        }
        
        const { error: profileError } = await (supabase as any)
          .from("marialima_profiles")
          .update(updateData)
          .eq("id", vars.id);
        if (profileError) console.error("Error updating profile:", profileError);
      }

      return data.user;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setOpenEdit(false);
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar usuário", { description: err.message });
    },
  });

  const handleEditClick = (p: Profile) => {
    const r = getUserRoles(p.id)[0]?.role || "seller";
    setEditingUser({
      id: p.id,
      email: "",
      password: "",
      full_name: p.full_name || "",
      role: r,
      nome_vendedor: p.nome_vendedor || "",
      loja: p.loja || "",
      active: p.active !== false,
      whatsapp: p.whatsapp || "",
      agente_ia: !!p.agente_ia,
      tipo_notificacao: p.tipo_notificacao || [],
    });
    setOpenEdit(true);
  };

  const handleToggleActive = (p: Profile) => {
    updateUser.mutate({ id: p.id, active: p.active === false ? true : false });
  };

  const getUserRoles = (userId: string) => {
    return roles?.filter((r) => r.user_id === userId) || [];
  };

  return (
    <div className="h-full w-full flex flex-col space-y-6 max-w-7xl mx-auto p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                if (newUser.whatsapp && newUser.whatsapp.replace(/\D/g, "").length < 11) {
                  toast.error("WhatsApp incompleto", { description: "O número deve ter 11 dígitos" });
                  return;
                }
                createUser.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const generatedUsername = name
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/\s+/g, "")
                      .toLowerCase();
                    setNewUser({ ...newUser, full_name: name, username: generatedUsername });
                  }}
                  placeholder="Nome Completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="off"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="usuario@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
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

              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={newUser.whatsapp}
                  onChange={(e) => setNewUser({ ...newUser, whatsapp: formatWhatsapp(e.target.value) })}
                  placeholder="(XX) X XXXX-XXXX"
                  maxLength={16}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="agente-ia-new"
                  checked={newUser.agente_ia}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, agente_ia: checked })}
                />
                <Label htmlFor="agente-ia-new">Ativar Agente IA</Label>
              </div>

              <div className="space-y-2">
                <Label>Tipos de Notificação</Label>
                <div className="flex flex-col gap-2">
                  {["Resumo diário geral", "Resumo diário vendedor", "Resumo por loja"].map(tipo => (
                    <div key={tipo} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`notif-new-${tipo}`}
                        checked={newUser.tipo_notificacao.includes(tipo)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewUser({ ...newUser, tipo_notificacao: [...newUser.tipo_notificacao, tipo] });
                          } else {
                            setNewUser({ ...newUser, tipo_notificacao: newUser.tipo_notificacao.filter(t => t !== tipo) });
                          }
                        }}
                      />
                      <Label htmlFor={`notif-new-${tipo}`} className="text-sm font-normal">{tipo}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {newUser.role === "seller" && (
                <div className="grid grid-cols-2 gap-4 border border-border/60 p-4 rounded-lg bg-secondary/20">
                  <div className="space-y-2">
                    <Label>Vendedor (Gigatech)</Label>
                    <Select 
                      value={newUser.nome_vendedor ? `${newUser.nome_vendedor}::${newUser.loja}` : ""} 
                      onValueChange={(v) => {
                        const [nv, lj] = v.split("::");
                        setNewUser({ ...newUser, nome_vendedor: nv, loja: lj === "null" ? "" : lj || "" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sellersInfo?.map((s) => (
                          <SelectItem key={`${s.nome_vendedor}-${s.loja}`} value={`${s.nome_vendedor}::${s.loja || "null"}`}>
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

        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingUser.whatsapp && editingUser.whatsapp.replace(/\D/g, "").length < 11) {
                    toast.error("WhatsApp incompleto", { description: "O número deve ter 11 dígitos" });
                    return;
                  }
                  updateUser.mutate({
                    id: editingUser.id,
                    email: editingUser.email,
                    password: editingUser.password,
                    full_name: editingUser.full_name,
                    role: editingUser.role,
                    active: editingUser.active
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Novo Email (deixe em branco para não alterar)</Label>
                  <Input
                    type="email"
                    autoComplete="off"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="usuario@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nova Senha (deixe em branco para não alterar)</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={editingUser.role} onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}>
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

                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={editingUser.whatsapp}
                    onChange={(e) => setEditingUser({ ...editingUser, whatsapp: formatWhatsapp(e.target.value) })}
                    placeholder="(XX) X XXXX-XXXX"
                    maxLength={16}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="agente-ia-edit"
                    checked={editingUser.agente_ia}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, agente_ia: checked })}
                  />
                  <Label htmlFor="agente-ia-edit">Ativar Agente IA</Label>
                </div>

                <div className="space-y-2">
                  <Label>Tipos de Notificação</Label>
                  <div className="flex flex-col gap-2">
                    {["Resumo diário geral", "Resumo diário vendedor", "Resumo por loja"].map(tipo => (
                      <div key={tipo} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`notif-edit-${tipo}`}
                          checked={editingUser.tipo_notificacao.includes(tipo)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditingUser({ ...editingUser, tipo_notificacao: [...editingUser.tipo_notificacao, tipo] });
                            } else {
                              setEditingUser({ ...editingUser, tipo_notificacao: editingUser.tipo_notificacao.filter(t => t !== tipo) });
                            }
                          }}
                        />
                        <Label htmlFor={`notif-edit-${tipo}`} className="text-sm font-normal">{tipo}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {editingUser.role === "seller" && (
                  <div className="grid grid-cols-2 gap-4 border border-border/60 p-4 rounded-lg bg-secondary/20">
                    <div className="space-y-2">
                      <Label>Vendedor (Gigatech)</Label>
                      <Select 
                        value={editingUser.nome_vendedor ? `${editingUser.nome_vendedor}::${editingUser.loja}` : ""} 
                        onValueChange={(v) => {
                          const [nv, lj] = v.split("::");
                          setEditingUser({ ...editingUser, nome_vendedor: nv, loja: lj === "null" ? "" : lj || "" });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sellersInfo?.map((s) => (
                            <SelectItem key={`${s.nome_vendedor}-${s.loja}`} value={`${s.nome_vendedor}::${s.loja || "null"}`}>
                              {s.nome_vendedor} {s.loja ? `(${s.loja})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Loja</Label>
                      <Input value={editingUser.loja} disabled placeholder="Preenchimento automático" />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border/60 w-full flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-sm font-semibold">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto relative">
          <div className="w-full min-w-max">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10">
                <tr className="bg-sidebar text-sidebar-foreground shadow-sm">
                  <th className="text-left px-4 py-2.5 font-medium">Usuário</th>
                  <th className="text-left px-4 py-2.5 font-medium">Funções</th>
                  <th className="text-left px-4 py-2.5 font-medium">Agente IA</th>
                  <th className="text-left px-4 py-2.5 font-medium">Notificações</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                ) : !profiles?.length ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário</td></tr>
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
                      <td className="px-4 py-2.5">
                        {p.agente_ia ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Ativo
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          {p.tipo_notificacao && p.tipo_notificacao.length > 0 ? (
                            p.tipo_notificacao.map(t => (
                              <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground w-max">
                                {t}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.active === false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive">
                            Inativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(p)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(p)} className={p.active === false ? "text-emerald-600" : "text-destructive"}>
                              {p.active === false ? (
                                <><CheckCircle className="w-4 h-4 mr-2" /> Ativar</>
                              ) : (
                                <><PowerOff className="w-4 h-4 mr-2" /> Inativar</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
