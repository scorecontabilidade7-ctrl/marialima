import { BarChart3, Target, Settings, LogIn, LogOut, Sun, Moon } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useUserAccess } from "@/hooks/useUserAccess";

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

export default function Sidebar() {
  const { session, signOut } = useAuth();
  const { isAdmin } = useUserAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { theme, toggle } = useTheme();

  const isDashboard = location.pathname === "/" || location.pathname === "/itapipoca";
  const view = searchParams.get("view") || "cockpit";
  const targetPath = isDashboard ? location.pathname : "/";

  return (
    <aside className="w-14 h-screen sticky top-0 bg-sidebar flex flex-col border-r border-sidebar-border shrink-0 z-50">
      <div className="h-14 flex items-center justify-center border-b border-sidebar-border shrink-0">
        <img src="/logo.png" alt="Maria Lima" className="w-9 h-9 object-contain" />
      </div>

      <nav className="flex-1 flex flex-col items-center py-3 gap-0.5">
        <TooltipItem
          icon={BarChart3}
          label="Cockpit"
          isActive={isDashboard && view === "cockpit"}
          onClick={() => navigate(`${targetPath}?view=cockpit`)}
        />
        <TooltipItem
          icon={Target}
          label="Metas"
          isActive={isDashboard && view === "metas"}
          onClick={() => navigate(`${targetPath}?view=metas`)}
        />
        {isAdmin && (
          <TooltipItem
            icon={Settings}
            label="Admin"
            isActive={location.pathname.startsWith("/admin")}
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
            onClick={async () => { await signOut(); navigate("/login"); }}
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
