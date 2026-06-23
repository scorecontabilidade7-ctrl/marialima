import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Target, Users, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";

const adminNav = [
  { id: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { id: "/admin/metas", label: "Metas", icon: Target },
  { id: "/admin/usuarios", label: "Usuários", icon: Users },
  { id: "/admin/permissoes", label: "Permissões", icon: ShieldCheck },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, signOut } = useAuth();

  if (!session) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-[200px] min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
        <div className="px-5 pt-6 pb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Admin</p>
          <h2 className="text-base font-bold text-primary tracking-tight">Portal Admin</h2>
        </div>

        <nav className="mt-4 flex-1 px-3 space-y-1">
          {adminNav.map((item) => {
            const isActive = location.pathname === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Ver Dashboard
          </button>
        </nav>

        <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-border/50 px-6 py-4 shrink-0">
          <h1 className="text-lg font-semibold tracking-tight">Portal Administrativo</h1>
        </header>
        <main className="flex-1 overflow-auto px-6 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
