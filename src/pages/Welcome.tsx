import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess, ALL_STORES, STORE_LABELS, type Store } from "@/hooks/useUserAccess";
import { MapPin, TrendingUp, BarChart3, ArrowRight, Lock } from "lucide-react";

const STORE_ROUTES: Record<Store, string> = {
  sobral: "/",
  itapipoca: "/itapipoca",
};

export default function Welcome() {
  const { session, loading: authLoading } = useAuth();
  const { accessibleStores, loading: accessLoading } = useUserAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) navigate("/login");
  }, [authLoading, session, navigate]);

  if (authLoading || accessLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/40">
        <img src="/logo.png" alt="Maria Lima" className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span>Maria Lima | Gestão de Vendas</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Logo destacada */}
        <div className="flex flex-col items-center gap-6 mb-14">
          <div className="relative">
            <div className="absolute -inset-6 bg-primary/5 rounded-full blur-2xl" />
            <img
              src="/logo.png"
              alt="Maria Lima"
              className="relative h-32 w-auto object-contain drop-shadow-md"
            />
          </div>

          <div className="text-center space-y-3 max-w-lg">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Bem-vindo ao Maria Lima | Gestão de Vendas
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Sua central de análise de vendas em tempo real. Acompanhe o desempenho
              de vendedores, departamentos e comissões com dados atualizados automaticamente.
            </p>
          </div>
        </div>

        {/* Seleção de loja */}
        <div className="w-full max-w-2xl space-y-4">
          <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
            Selecione a loja
          </p>

          {accessibleStores.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-2">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm">Nenhuma loja disponível para o seu usuário.</p>
              <p className="text-xs">Entre em contato com o administrador para solicitar acesso.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ALL_STORES.map((store) => {
                const hasAccess = accessibleStores.includes(store);
                return hasAccess ? (
                  <button
                    key={store}
                    onClick={() => navigate(STORE_ROUTES[store])}
                    className="group relative bg-card border border-border/60 hover:border-primary/60 rounded-2xl p-7 text-left transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/15 transition-colors">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-1.5">
                      Loja {STORE_LABELS[store]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Dashboard completo com rankings, metas e análise de comissões.
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-primary font-medium">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Dados em tempo real</span>
                    </div>
                  </button>
                ) : (
                  <div
                    key={store}
                    className="relative bg-card border border-border/30 rounded-2xl p-7 opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-muted rounded-xl">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Sem acesso
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-1.5">
                      Loja {STORE_LABELS[store]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Solicite acesso ao administrador.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-muted-foreground/50 border-t border-border/30">
        © {new Date().getFullYear()} Maria Lima — Todos os direitos reservados
      </footer>
    </div>
  );
}
