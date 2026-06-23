import { BarChart3, Target, Settings, LogIn, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: "cockpit", label: "Cockpit", icon: BarChart3 },
  { id: "metas", label: "Metas", icon: Target },
];

function TooltipItem({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group w-full px-2">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center justify-center p-2.5 rounded-md transition-colors
          ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }
        `}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
      </button>
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5
                        rounded-md shadow-md border border-border whitespace-nowrap">
          {label}
          <span className="absolute right-full top-1/2 -translate-y-1/2
                           border-4 border-transparent border-r-border" />
          <span className="absolute right-full top-1/2 -translate-y-1/2 translate-x-px
                           border-4 border-transparent border-r-popover" />
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-14 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
      <div className="h-14 flex items-center justify-center border-b border-sidebar-border shrink-0">
        <img src="/logo.png" alt="Maria Lima" className="w-9 h-9 object-contain" />
      </div>

      <nav className="flex-1 flex flex-col items-center py-3 gap-0.5">
        {navItems.map((item) => (
          <TooltipItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={item.id === activeView}
            onClick={() => onViewChange(item.id)}
          />
        ))}
        {session && (
          <TooltipItem
            icon={Settings}
            label="Admin"
            onClick={() => navigate("/admin")}
          />
        )}
      </nav>

      <div className="pb-3 flex flex-col items-center gap-0.5 border-t border-sidebar-border pt-3">
        <TooltipItem
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          onClick={toggle}
        />
        {session ? (
          <TooltipItem
            icon={LogOut}
            label="Sair"
            onClick={async () => { await signOut(); }}
          />
        ) : (
          <TooltipItem
            icon={LogIn}
            label="Entrar"
            onClick={() => navigate("/login")}
          />
        )}
      </div>
    </aside>
  );
}
