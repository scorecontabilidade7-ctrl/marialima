import { Card, CardContent } from "@/components/ui/card";
import { Target, Users, BarChart3, ShieldCheck, UserSquare2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const cards = [
    { label: "Gestão de Metas", desc: "Cadastrar e editar metas mensais da loja", icon: Target, path: "/admin/metas" },
    { label: "Vendedores & Fotos", desc: "Gerenciar fotos e nomes exatos dos vendedores", icon: UserSquare2, path: "/admin/vendedores" },
    { label: "Gestão de Usuários", desc: "Gerenciar usuários do portal e níveis de acesso", icon: Users, path: "/admin/usuarios" },
    { label: "Permissões Avançadas", desc: "Visualizar e atribuir papéis globais por usuário", icon: ShieldCheck, path: "/admin/permissoes" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20">
      <div className="max-w-5xl mx-auto p-8 space-y-8 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal Administrativo</h1>
          <p className="text-base text-muted-foreground mt-2">Central de controle para gerenciar regras de negócio, acessos e configurações do Score Finance.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map((c) => (
            <Card
              key={c.path}
              className="border border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden bg-card"
              onClick={() => navigate(c.path)}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <c.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">{c.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
