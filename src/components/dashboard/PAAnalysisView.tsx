import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Info,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Award,
  Layers,
  Sparkles,
  Receipt,
  Package,
  CircleHelp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePAAnalysis,
  type PASellerItem,
  type PAFilters,
} from "@/hooks/usePAAnalysis";

interface PAAnalysisViewProps {
  store?: "sobral" | "itapipoca" | "consolidado";
  selectedMonth: { year: number; month: number };
  filters: {
    vendedores?: string[];
    vendedor?: string;
    departamento?: string;
    dataInicio?: string;
    dataFim?: string;
  };
}

// ── Formatadores Auxiliares ──────────────────────────────────────────────────
const fmtCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const fmtInteger = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(Math.round(val || 0));

const fmtPA = (val: number) =>
  (val || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PAAnalysisView({
  store = "sobral",
  selectedMonth,
  filters,
}: PAAnalysisViewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const paFilters: PAFilters = useMemo(
    () => ({
      year: selectedMonth.year,
      month: selectedMonth.month,
      vendedores: filters.vendedores,
      vendedor: filters.vendedor,
      dataInicio: filters.dataInicio,
      dataFim: filters.dataFim,
    }),
    [selectedMonth, filters]
  );

  const { data, isLoading, error } = usePAAnalysis(store, paFilters);

  // Filtragem local por termo de busca no ranking de vendedores
  const filteredRanking = useMemo(() => {
    if (!data?.ranking) return [];
    if (!searchTerm.trim()) return data.ranking;
    const term = searchTerm.toLowerCase().trim();
    return data.ranking.filter((item) =>
      item.vendedor.toLowerCase().includes(term)
    );
  }, [data?.ranking, searchTerm]);

  // Maior P.A para basear a barra de progresso relativa
  const maxPA = useMemo(() => {
    if (!data?.ranking || data.ranking.length === 0) return 1;
    return Math.max(...data.ranking.map((r) => r.pa), 1);
  }, [data?.ranking]);

  const handleSellerClick = (sellerName: string) => {
    const params = new URLSearchParams();
    if (data?.clienteId) params.set("cliente_id", data.clienteId);
    params.set("year", String(selectedMonth.year));
    params.set("month", String(selectedMonth.month));
    params.set("store", store);
    navigate(`/vendedor/${encodeURIComponent(sellerName)}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Skeleton className="h-10 w-72 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-base font-semibold text-destructive">
          Erro ao carregar análise de P.A
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
      </div>
    );
  }

  const kpis = data?.kpis ?? {
    total_itens_loja: 0,
    total_vendas_loja: 0,
    total_valor_loja: 0,
    pa_loja: 0,
    ticket_medio_loja: 0,
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Topo: Header com Busca e Tooltip Explicativo ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/70 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Peças por Atendimento (P.A)
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    aria-label="Informações sobre o cálculo do P.A"
                  >
                    <CircleHelp className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 text-xs leading-relaxed">
                  <div className="space-y-2">
                    <p className="font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Fórmulas de Cálculo:
                    </p>
                    <div>
                      <span className="font-semibold text-foreground">P.A do Vendedor:</span>
                      <p className="text-muted-foreground mt-0.5">
                        Total de produtos vendidos ÷ Número de atendimentos
                      </p>
                    </div>
                    <div className="pt-1.5 border-t border-border/50">
                      <span className="font-semibold text-foreground">P.A da Loja:</span>
                      <p className="text-muted-foreground mt-0.5">
                        Quantidade de produtos vendidos ÷ Quantidade de vendas
                      </p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Badge variant="outline" className="text-[11px] font-semibold bg-secondary/60 text-secondary-foreground border-border">
                {store === "consolidado" ? "Consolidado" : store === "itapipoca" ? "Itapipoca" : "Sobral"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Avaliação de eficiência de cross-selling e volume de itens comercializados por atendimento.
            </p>
          </div>
        </div>

        {/* Input de Busca Rápida */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-10 text-sm bg-background border-border/80 focus-visible:ring-primary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Seção de KPIs Gerais da Loja (Grid de 4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: P.A da Loja (Destaque Principal) */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm hover:shadow transition-all relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-10 text-primary">
            <ShoppingBag className="w-20 h-20" />
          </div>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              P.A da Loja
            </CardTitle>
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shadow-sm">
              Média Geral
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
                {fmtPA(kpis.pa_loja)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                peças/atend.
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Base de {fmtInteger(kpis.total_itens_loja)} peças em {fmtInteger(kpis.total_vendas_loja)} vendas
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total de Produtos */}
        <Card className="border-border bg-card shadow-sm hover:shadow transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Produtos
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {fmtInteger(kpis.total_itens_loja)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Unidades faturadas no período
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Atendimentos (Vendas) */}
        <Card className="border-border bg-card shadow-sm hover:shadow transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Atendimentos (Vendas)
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Receipt className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {fmtInteger(kpis.total_vendas_loja)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Transações e cupons emitidos
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Ticket Médio */}
        <Card className="border-border bg-card shadow-sm hover:shadow transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {fmtCurrency(kpis.ticket_medio_loja)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Faturamento médio por atendimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Tabela de Ranking & Listagem de Vendedores ── */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Ranking de Peças por Atendimento
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Classificado por maior P.A com desempate em volume de produtos e total vendido
              </p>
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              Exibindo <span className="font-bold text-foreground">{filteredRanking.length}</span> vendedores
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredRanking.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">
                Nenhum vendedor encontrado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm
                  ? `Nenhum resultado corresponde à busca "${searchTerm}".`
                  : "Não há registros de vendas para o período ou filtros selecionados."}
              </p>
            </div>
          ) : (
            <>
              {/* --- TABELA DESKTOP --- */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Vendedor</th>
                      <th className="py-3 px-4 w-52">P.A (Peças/Atend.)</th>
                      <th className="py-3 px-4 text-right">Produtos (Itens)</th>
                      <th className="py-3 px-4 text-right">Atendimentos</th>
                      <th className="py-3 px-4 text-right">Ticket Médio</th>
                      <th className="py-3 px-4 text-right">Total Vendido</th>
                      <th className="py-3 px-4 text-center">vs. Média Loja</th>
                      <th className="py-3 px-4 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredRanking.map((item, index) => {
                      const isFirst = index === 0;
                      const isSecond = index === 1;
                      const isThird = index === 2;
                      const isAboveOrEqual = item.diff_vs_loja >= 0;
                      const progressPct = maxPA > 0 ? Math.min(100, Math.round((item.pa / maxPA) * 100)) : 0;
                      const firstName = item.vendedor.split(" ")[0];

                      return (
                        <tr
                          key={item.vendedor}
                          onClick={() => handleSellerClick(item.vendedor)}
                          className="group cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          {/* Coluna Posição */}
                          <td className="py-3.5 px-4 text-center">
                            {isFirst ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-xs border border-amber-500/30">
                                1
                              </span>
                            ) : isSecond ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-600 dark:text-slate-300 font-extrabold text-xs border border-slate-400/30">
                                2
                              </span>
                            ) : isThird ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/15 text-amber-700 dark:text-amber-500 font-extrabold text-xs border border-amber-700/30">
                                3
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground/70">
                                {index + 1}
                              </span>
                            )}
                          </td>

                          {/* Coluna Vendedor */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border bg-secondary flex items-center justify-center font-bold text-xs text-primary shadow-xs">
                                {item.url_foto ? (
                                  <img
                                    src={item.url_foto}
                                    alt={item.vendedor}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  firstName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                    {item.vendedor}
                                  </span>
                                  {isFirst && (
                                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0">
                                      Líder de P.A
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Coluna P.A + Micro Barra */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <div className="flex items-baseline justify-between">
                                <span className="font-extrabold text-foreground text-sm tabular-nums">
                                  {fmtPA(item.pa)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  peças/atend.
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isAboveOrEqual ? "bg-emerald-500" : "bg-primary"
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Coluna Produtos */}
                          <td className="py-3.5 px-4 text-right font-medium text-foreground tabular-nums">
                            {fmtInteger(item.total_itens)}
                          </td>

                          {/* Coluna Atendimentos */}
                          <td className="py-3.5 px-4 text-right font-medium text-foreground tabular-nums">
                            {fmtInteger(item.total_atendimentos)}
                          </td>

                          {/* Coluna Ticket Médio */}
                          <td className="py-3.5 px-4 text-right font-medium text-foreground tabular-nums">
                            {fmtCurrency(item.ticket_medio)}
                          </td>

                          {/* Coluna Total Vendido */}
                          <td className="py-3.5 px-4 text-right font-bold text-foreground tabular-nums">
                            {fmtCurrency(item.total_valor)}
                          </td>

                          {/* Coluna vs Média Loja */}
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-bold px-2 py-0.5 inline-flex items-center gap-1 ${
                                isAboveOrEqual
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {isAboveOrEqual ? (
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-rose-500" />
                              )}
                              <span>
                                {isAboveOrEqual ? "+" : ""}
                                {fmtPA(item.diff_vs_loja)}
                              </span>
                            </Badge>
                          </td>

                          {/* Ação de Navegação */}
                          <td className="py-3.5 px-4 text-center">
                            <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors inline-block" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* --- CARDS MOBILE --- */}
              <div className="block md:hidden divide-y divide-border/60">
                {filteredRanking.map((item, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;
                  const isAboveOrEqual = item.diff_vs_loja >= 0;
                  const progressPct = maxPA > 0 ? Math.min(100, Math.round((item.pa / maxPA) * 100)) : 0;
                  const firstName = item.vendedor.split(" ")[0];

                  return (
                    <div
                      key={item.vendedor}
                      onClick={() => handleSellerClick(item.vendedor)}
                      className="p-4 active:bg-muted/60 transition-colors cursor-pointer space-y-3"
                    >
                      {/* Topo do Card: Posição, Avatar, Nome e P.A */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Posição */}
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              isFirst
                                ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                : isSecond
                                ? "bg-slate-400/20 text-slate-600 border border-slate-400/30"
                                : isThird
                                ? "bg-amber-700/15 text-amber-700 border border-amber-700/30"
                                : "text-muted-foreground bg-secondary text-[11px]"
                            }`}
                          >
                            {index + 1}
                          </span>

                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border bg-secondary flex items-center justify-center font-bold text-xs text-primary shadow-xs">
                            {item.url_foto ? (
                              <img
                                src={item.url_foto}
                                alt={item.vendedor}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              firstName.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          {/* Nome */}
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">
                              {item.vendedor}
                            </p>
                            {isFirst && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                ★ Líder de P.A
                              </span>
                            )}
                          </div>
                        </div>

                        {/* P.A & Badge vs Loja */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="text-base font-black text-foreground tabular-nums">
                              {fmtPA(item.pa)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">P.A</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-1.5 py-0 mt-0.5 inline-flex items-center gap-0.5 ${
                              isAboveOrEqual
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {isAboveOrEqual ? (
                              <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
                            )}
                            <span>
                              {isAboveOrEqual ? "+" : ""}
                              {fmtPA(item.diff_vs_loja)}
                            </span>
                          </Badge>
                        </div>
                      </div>

                      {/* Barra de Progresso Mobile */}
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isAboveOrEqual ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Mini Grid Inferior: Produtos, Atendimentos e Total Vendido */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center bg-secondary/30 rounded-lg p-2 border border-border/40 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                            Produtos
                          </span>
                          <span className="font-bold text-foreground tabular-nums">
                            {fmtInteger(item.total_itens)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                            Atendimentos
                          </span>
                          <span className="font-bold text-foreground tabular-nums">
                            {fmtInteger(item.total_atendimentos)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                            Total Vendido
                          </span>
                          <span className="font-bold text-foreground tabular-nums text-[11px]">
                            {fmtCurrency(item.total_valor)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
