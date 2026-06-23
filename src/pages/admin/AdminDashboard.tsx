import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, BarChart3, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const cards = [
    { label: "Gestão de Metas", desc: "Cadastrar e editar metas mensais da loja", icon: Target, path: "/admin/metas" },
    { label: "Gestão de Usuários", desc: "Gerenciar usuários e permissões", icon: Users, path: "/admin/usuarios" },
    { label: "Permissões", desc: "Visualizar e atribuir papéis por usuário", icon: ShieldCheck, path: "/admin/permissoes" },
    { label: "Ver Dashboard", desc: "Acessar o dashboard de vendas", icon: BarChart3, path: "/" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Painel Administrativo</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie metas, usuários e permissões</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card
            key={c.path}
            className="border border-border/60 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => navigate(c.path)}
          >
            <CardContent className="p-5">
              <c.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold">{c.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
