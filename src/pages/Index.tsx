import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSalesData } from "@/hooks/useSalesData";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import KPICards from "@/components/dashboard/KPICards";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import SalesRanking from "@/components/dashboard/SalesRanking";
import SalesTimeline from "@/components/dashboard/SalesTimeline";
import DepartmentChart from "@/components/dashboard/DepartmentChart";
import Sidebar from "@/components/dashboard/Sidebar";
import MetasTracking, { META_OPTIONS, type MetaKey } from "@/components/dashboard/MetasTracking";
import { Skeleton } from "@/components/ui/skeleton";
import { BR_TIME_ZONE, formatTimeHMInTimeZone, getDatePartsInTimeZone } from "@/lib/utils";

const STORE_LABELS: Record<string, string> = {
  sobral: "Sobral",
  itapipoca: "Itapipoca",
};

interface IndexProps {
  store?: "sobral" | "itapipoca";
}

export default function Index({ store = "sobral" }: IndexProps) {
  const now = new Date();
  const { year: currentYear, month: currentMonth } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = sessionStorage.getItem("dashboardSelectedMonth");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { year: currentYear, month: currentMonth };
  });

  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem("dashboardFilters");
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      vendedor: "all",
      departamento: "all",
      dataInicio: "",
      dataFim: "",
    };
  });

  useEffect(() => {
    sessionStorage.setItem("dashboardSelectedMonth", JSON.stringify(selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    sessionStorage.setItem("dashboardFilters", JSON.stringify(filters));
  }, [filters]);

  const { data, isLoading, error, dataUpdatedAt } = useSalesData(store, {
    year: selectedMonth.year,
    month: selectedMonth.month,
    vendedor: filters.vendedor,
    departamento: filters.departamento,
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim,
  });
  const { session, loading: authLoading } = useAuth();
  const { hasStoreAccess, loading: accessLoading } = useUserAccess();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("cockpit");
  const [selectedMeta, setSelectedMeta] = useState<MetaKey>("minima");

  const goToPrevMonth = () => {
    setSelectedMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };
  const goToNextMonth = () => {
    setSelectedMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };
  const isCurrentMonth = selectedMonth.year === currentYear && selectedMonth.month === currentMonth;

  const selectedMonthLabel = new Date(selectedMonth.year, selectedMonth.month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    if (!authLoading && !session) { navigate("/login"); return; }
    if (!authLoading && !accessLoading && session && !hasStoreAccess(store as any)) navigate("/welcome");
  }, [authLoading, accessLoading, session, store, hasStoreAccess, navigate]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-muted-foreground">Redirecionando para o login…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-destructive text-lg font-medium">Erro ao carregar dados</p>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/60 px-6 py-3 flex items-center justify-between shrink-0 bg-card">
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-bold text-foreground tracking-tight">Dashboard de Vendas</h1>
              <span className="text-base font-light text-muted-foreground/50">|</span>
              <span className="text-sm font-semibold text-primary">Maria Lima</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Análise de vendedores, departamentos e comissões em tempo real.
            </p>
          </div>
          {/* Store switcher */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden text-xs font-medium">
            <button
              onClick={() => navigate("/")}
              className={`px-3.5 py-1.5 transition-colors ${
                store === "sobral"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Sobral
            </button>
            <button
              onClick={() => navigate("/itapipoca")}
              className={`px-3.5 py-1.5 transition-colors ${
                store === "itapipoca"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Itapipoca
            </button>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date().toLocaleDateString("pt-BR", {
                timeZone: BR_TIME_ZONE,
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            {dataUpdatedAt ? (
              <p className="text-xs text-muted-foreground/50 tabular-nums">
                Atualizado às {formatTimeHMInTimeZone(new Date(dataUpdatedAt), BR_TIME_ZONE)}
              </p>
            ) : null}
          </div>
        </header>

        {/* Filtros — sempre visíveis */}
        <div className="border-b border-border/40 px-6 py-3 bg-card/50">
          <div className="flex flex-wrap items-end gap-3">
            {/* Navegador de mês */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Mês</label>
              <div className="flex items-center gap-1 h-9 border border-border rounded-md bg-secondary px-1">
                <button
                  onClick={goToPrevMonth}
                  className="p-1 rounded hover:bg-accent transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <span className="text-sm font-medium w-32 text-center capitalize tabular-nums select-none">
                  {selectedMonthLabel}
                </span>
                <button
                  onClick={goToNextMonth}
                  disabled={isCurrentMonth}
                  className="p-1 rounded hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <DashboardFilters
              filterOptions={data?.filter_options}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            {activeView === "metas" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Meta</label>
                <div className="flex items-center border border-border rounded-md overflow-hidden h-9">
                  {META_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedMeta(opt.key)}
                      className={`px-3 h-full text-xs font-medium transition-colors ${
                        selectedMeta === opt.key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Skeleton className="h-[380px] rounded-lg" />
                <Skeleton className="h-[380px] rounded-lg" />
              </div>
            </div>
          ) : activeView === "metas" ? (
            <MetasTracking ranking={data?.ranking ?? []} timeline={data?.timeline ?? []} selectedMeta={selectedMeta} onMetaChange={setSelectedMeta} store={store} selectedMonth={selectedMonth} />
          ) : (
            <>
              <KPICards kpis={data?.kpis} timeline={data?.timeline ?? []} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SalesRanking ranking={data?.ranking ?? []} selectedMonth={selectedMonth} store={store} />
                <DepartmentChart
                  departamentos={data?.departamentos ?? []}
                  totalVendas={data?.kpis?.total_vendas ?? 0}
                />
              </div>

              <SalesTimeline timeline={data?.timeline ?? []} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
