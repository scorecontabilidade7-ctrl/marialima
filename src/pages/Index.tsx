import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, HelpCircle, Filter } from "lucide-react";
import { useSalesData, useDataExtracao } from "@/hooks/useSalesData";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import KPICards from "@/components/dashboard/KPICards";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import SalesRanking from "@/components/dashboard/SalesRanking";
import SalesTimeline from "@/components/dashboard/SalesTimeline";
import DepartmentChart from "@/components/dashboard/DepartmentChart";
import Sidebar from "@/components/dashboard/Sidebar";
import MetasTracking, { META_OPTIONS, type MetaKey } from "@/components/dashboard/MetasTracking";
import { useCurrentMonthGoals } from "@/hooks/useMonthlyGoals";
import { useDynamicCommissions } from "@/hooks/useDynamicCommissions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

  const initialCommissionStr = sessionStorage.getItem("dashboardCommissionMode");
  const [commissionMode, setCommissionMode] = useState<"fixa" | "dinamica">(
    (initialCommissionStr as "fixa" | "dinamica") || "dinamica"
  );

  const clearFilters = () => {
    setFilters({
      vendedor: "all",
      departamento: "all",
      dataInicio: "",
      dataFim: "",
    });
  };

  const hasActiveFilters = 
    filters.vendedor !== "all" || 
    filters.departamento !== "all" || 
    filters.dataInicio !== "" || 
    filters.dataFim !== "";

  useEffect(() => {
    sessionStorage.setItem("dashboardSelectedMonth", JSON.stringify(selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    sessionStorage.setItem("dashboardFilters", JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    sessionStorage.setItem("dashboardCommissionMode", commissionMode);
  }, [commissionMode]);

  const { data, isLoading, error, dataUpdatedAt } = useSalesData(store, {
    year: selectedMonth.year,
    month: selectedMonth.month,
    vendedor: filters.vendedor,
    departamento: filters.departamento,
    dataInicio: filters.dataInicio,
    dataFim: filters.dataFim,
  });
  const { data: maxExtracao } = useDataExtracao();
  const maxExtracaoDate = maxExtracao ? new Date(maxExtracao) : null;

  const { session, loading: authLoading } = useAuth();
  const { hasStoreAccess, loading: accessLoading, isSeller, profileData } = useUserAccess();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "cockpit";
  const [selectedMeta, setSelectedMeta] = useState<MetaKey>("minima");

  const targetYearMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const { data: goalData } = useCurrentMonthGoals(store, targetYearMonth);

  const dynamicRanking = useDynamicCommissions(
    data?.ranking ?? [],
    goalData,
    commissionMode === "dinamica"
  );

  const kpis = useMemo(() => {
    if (!data?.kpis) return data?.kpis;
    if (commissionMode !== "dinamica") return data.kpis;
    const total_comissoes = dynamicRanking.reduce((s, r) => s + r.comissao, 0);
    return { ...data.kpis, total_comissoes };
  }, [data?.kpis, commissionMode, dynamicRanking]);

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
    if (!authLoading && session && isSeller && profileData?.nome_vendedor) {
      navigate(`/vendedor/${encodeURIComponent(profileData.nome_vendedor)}?store=${profileData.loja || 'sobral'}`, { replace: true });
      return;
    }
    if (!authLoading && !accessLoading && session && !hasStoreAccess(store as any)) navigate("/welcome");
  }, [authLoading, accessLoading, session, store, hasStoreAccess, navigate, isSeller, profileData]);

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
    <div className="flex-1 min-w-0 flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-border/60 px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between shrink-0 bg-card gap-3 md:gap-0">
        <div className="hidden md:block">
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
        <div className="flex w-full md:w-auto items-center border border-border rounded-lg overflow-hidden text-xs font-medium">
          <button
            onClick={() => navigate("/")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "sobral"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Sobral
          </button>
          <button
            onClick={() => navigate("/itapipoca")}
            className={`flex-1 md:flex-none px-3.5 py-2 md:py-1.5 transition-colors ${
              store === "itapipoca"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Itapipoca
          </button>
        </div>
        <div className="text-right hidden md:block">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-sm font-medium text-foreground">
                {(() => {
                  const hour = parseInt(new Date().toLocaleTimeString("pt-BR", { timeZone: BR_TIME_ZONE, hour: "2-digit", hour12: false }));
                  const name = session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "";
                  const firstName = name.split(" ")[0];
                  if (hour >= 5 && hour < 12) return `Bom dia, ${firstName} ☁️`;
                  if (hour >= 12 && hour < 18) return `Boa tarde, ${firstName} ☀️`;
                  return `Boa noite, ${firstName} 🌙`;
                })()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date().toLocaleDateString("pt-BR", {
                  timeZone: BR_TIME_ZONE,
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {maxExtracaoDate ? (
                <>
                  <span className="text-xs text-muted-foreground/30">•</span>
                  <span className="text-xs text-muted-foreground/60 tabular-nums">
                    Atualizado às {formatTimeHMInTimeZone(maxExtracaoDate, BR_TIME_ZONE)}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Filtros */}
        <div className="sticky top-0 z-40 border-b border-border/40 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
          {/* Mobile Filter Toggle & Basic Filters (Mês) */}
          <div className="flex md:hidden items-center justify-between gap-2 w-full">
            <div className="flex items-center justify-between h-10 border border-border rounded-md bg-secondary px-1 flex-1">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 rounded hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-medium text-center capitalize tabular-nums select-none truncate px-2">
                {selectedMonthLabel}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <button className="flex items-center justify-center gap-2 px-3 h-10 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm font-medium hover:bg-primary/20 transition-colors">
                  <Filter className="w-4 h-4" />
                  <span>Filtros</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:max-w-md overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
                <SheetHeader className="mb-5 text-left">
                  <SheetTitle>Filtros do Dashboard</SheetTitle>
                  <SheetDescription>
                    Refine os resultados do dashboard.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-6">
                  <DashboardFilters
                    filterOptions={data?.filter_options}
                    filters={filters}
                    selectedMonth={selectedMonth}
                    onFilterChange={handleFilterChange}
                    onClearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                  
                  {activeView === "metas" && (
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Meta</label>
                      <div className="flex flex-col bg-secondary/50 p-1.5 rounded-lg border border-border/40 gap-1.5">
                        {META_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setSelectedMeta(opt.key)}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
                              selectedMeta === opt.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Comissão</label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-medium">
                            <HelpCircle className="w-3.5 h-3.5" />
                            Entenda
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px] rounded-lg">
                          <DialogHeader>
                            <DialogTitle>Tipos de Comissão</DialogTitle>
                            <DialogDescription>
                              Entenda como os valores de comissão são exibidos no painel.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-2 text-sm">
                            <div>
                              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                Comissão Dinâmica
                              </h4>
                              <p className="text-muted-foreground mt-1.5">
                                Calculada em tempo real com base na Meta da Loja dividida pelo número de vendedores ativos no mês. A porcentagem varia de acordo com a faixa alcançada:
                              </p>
                              <ul className="mt-2.5 space-y-1.5 text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                                <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Master</span> <span>2,0%</span></li>
                                <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Top 2</span> <span>1,5%</span></li>
                                <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Top 1</span> <span>1,3%</span></li>
                                <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Mínima</span> <span>1,0%</span></li>
                                <li className="flex justify-between text-muted-foreground/70"><span className="font-medium">Abaixo da Mínima</span> <span>0%</span></li>
                              </ul>
                            </div>
                            <div className="pt-4 border-t border-border/50">
                              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                                Comissão Fixa
                              </h4>
                              <p className="text-muted-foreground mt-1.5">
                                Exibe o valor exato importado da sua base de dados original, sem aplicar a regra de metas do painel.
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex bg-secondary/50 p-1.5 rounded-lg border border-border/40 h-12">
                      <button
                        onClick={() => setCommissionMode("dinamica")}
                        className={`flex-1 px-3 h-full text-sm font-bold rounded-md transition-all duration-200 ${
                          commissionMode === "dinamica"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        Dinâmica
                      </button>
                      <button
                        onClick={() => setCommissionMode("fixa")}
                        className={`flex-1 px-3 h-full text-sm font-bold rounded-md transition-all duration-200 ${
                          commissionMode === "fixa"
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        Fixa
                      </button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex flex-wrap items-end gap-3">
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
              selectedMonth={selectedMonth}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
            {activeView === "metas" && (
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Meta</label>
                <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/40 h-9">
                  {META_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSelectedMeta(opt.key)}
                      className={`relative px-4 h-full text-xs font-bold rounded-md transition-all duration-200 ${
                        selectedMeta === opt.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Toggle de Comissões */}
            <div className="space-y-1.5 ml-auto">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de Comissão</label>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-primary transition-colors" title="Como funciona?">
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Tipos de Comissão</DialogTitle>
                      <DialogDescription>
                        Entenda como os valores de comissão são exibidos no painel.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2 text-sm">
                      <div>
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          Comissão Dinâmica
                        </h4>
                        <p className="text-muted-foreground mt-1.5">
                          Calculada em tempo real com base na Meta da Loja dividida pelo número de vendedores ativos no mês. A porcentagem varia de acordo com a faixa alcançada:
                        </p>
                        <ul className="mt-2.5 space-y-1.5 text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border/50">
                          <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Master</span> <span>2,0%</span></li>
                          <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Top 2</span> <span>1,5%</span></li>
                          <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Top 1</span> <span>1,3%</span></li>
                          <li className="flex justify-between"><span className="font-medium text-foreground">Atingiu Mínima</span> <span>1,0%</span></li>
                          <li className="flex justify-between text-muted-foreground/70"><span className="font-medium">Abaixo da Mínima</span> <span>0%</span></li>
                        </ul>
                      </div>
                      <div className="pt-4 border-t border-border/50">
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                          Comissão Fixa
                        </h4>
                        <p className="text-muted-foreground mt-1.5">
                          Exibe o valor exato importado da sua base de dados original, sem aplicar a regra de metas do painel.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/40 h-9">
                <button
                  onClick={() => setCommissionMode("dinamica")}
                  className={`px-3 h-full text-xs font-bold rounded-md transition-all duration-200 ${
                    commissionMode === "dinamica"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Dinâmica
                </button>
                <button
                  onClick={() => setCommissionMode("fixa")}
                  className={`px-3 h-full text-xs font-bold rounded-md transition-all duration-200 ${
                    commissionMode === "fixa"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Fixa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 md:px-6 py-5 space-y-5">
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
            <MetasTracking ranking={dynamicRanking} timeline={data?.timeline ?? []} selectedMeta={selectedMeta} onMetaChange={setSelectedMeta} store={store} selectedMonth={selectedMonth} />
          ) : (
            <>
              <KPICards kpis={kpis} timeline={data?.timeline ?? []} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SalesRanking ranking={dynamicRanking} selectedMonth={selectedMonth} store={store} />
                <DepartmentChart
                  departamentos={data?.departamentos ?? []}
                  totalVendas={data?.kpis?.total_vendas ?? 0}
                />
              </div>

              <SalesTimeline 
                timeline={data?.timeline ?? []} 
                metaDiaria={goalData ? (goalData.meta_minima ?? 90000) / (goalData.dias_uteis ?? 24) : 90000 / 24}
              />
            </>
          )}
        </main>
    </div>
  );
}
