import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  X,
  ArrowLeftRight,
  Layers,
  Calendar,
} from "recharts";
import {
  ArrowUpRight as LucideArrowUpRight,
  ArrowDownRight as LucideArrowDownRight,
  Minus as LucideMinus,
  DollarSign as LucideDollarSign,
  ShoppingCart as LucideShoppingCart,
  TrendingUp as LucideTrendingUp,
  Users as LucideUsers,
  X as LucideX,
  ArrowLeftRight as LucideArrowLeftRight,
  Layers as LucideLayers,
  Calendar as LucideCalendar,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { DashboardData } from "@/hooks/useSalesData";
import type { MonthlyGoal } from "@/hooks/useMonthlyGoals";

interface MonthObj {
  year: number;
  month: number;
}

interface MonthlyComparisonViewProps {
  store: "sobral" | "itapipoca" | "consolidado";
  baseMonth: MonthObj;
  compareMonth: MonthObj;
  onBaseMonthChange?: (month: MonthObj) => void;
  onCompareMonthChange: (month: MonthObj) => void;
  onClose: () => void;
  baseData?: DashboardData;
  compareData?: DashboardData;
  baseGoalData?: MonthlyGoal;
  compareGoalData?: MonthlyGoal;
  commissionMode: "fixa" | "dinamica";
  isLoadingCompare?: boolean;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

function getDelta(baseVal: number, compVal: number) {
  const diff = baseVal - compVal;
  const percent = compVal > 0 ? ((baseVal - compVal) / compVal) * 100 : baseVal > 0 ? 100 : 0;
  return {
    diff,
    percent,
    isPositive: diff > 0,
    isNegative: diff < 0,
    isZero: diff === 0,
  };
}

export default function MonthlyComparisonView({
  store,
  baseMonth,
  compareMonth,
  onBaseMonthChange,
  onCompareMonthChange,
  onClose,
  baseData,
  compareData,
  commissionMode,
  isLoadingCompare,
}: MonthlyComparisonViewProps) {
  const baseLabel = `${MONTH_NAMES[baseMonth.month - 1]} / ${baseMonth.year}`;
  const compareLabel = `${MONTH_NAMES[compareMonth.month - 1]} / ${compareMonth.year}`;

  // Generate available months for selection (from 2024 to 2026)
  const availableMonthOptions = useMemo(() => {
    const list = [];
    for (let y = 2026; y >= 2024; y--) {
      for (let m = 12; m >= 1; m--) {
        list.push({
          value: `${y}-${m}`,
          label: `${MONTH_NAMES[m - 1]} de ${y}`,
          year: y,
          month: m,
        });
      }
    }
    return list;
  }, []);

  // Quick Presets
  const setPreviousMonthPreset = () => {
    if (baseMonth.month === 1) {
      onCompareMonthChange({ year: baseMonth.year - 1, month: 12 });
    } else {
      onCompareMonthChange({ year: baseMonth.year, month: baseMonth.month - 1 });
    }
  };

  const setPreviousYearPreset = () => {
    onCompareMonthChange({ year: baseMonth.year - 1, month: baseMonth.month });
  };

  const swapMonths = () => {
    if (onBaseMonthChange) {
      const oldBase = { ...baseMonth };
      onBaseMonthChange({ ...compareMonth });
      onCompareMonthChange(oldBase);
    }
  };

  const isPreviousMonthActive =
    (baseMonth.month === 1 && compareMonth.year === baseMonth.year - 1 && compareMonth.month === 12) ||
    (compareMonth.year === baseMonth.year && compareMonth.month === baseMonth.month - 1);

  const isPreviousYearActive =
    compareMonth.year === baseMonth.year - 1 && compareMonth.month === baseMonth.month;

  // Base KPIs
  const baseKpis = baseData?.kpis || { total_vendas: 0, qtd_vendas: 0, ticket_medio: 0, total_comissoes: 0 };
  const compKpis = compareData?.kpis || { total_vendas: 0, qtd_vendas: 0, ticket_medio: 0, total_comissoes: 0 };

  const deltaVendas = getDelta(baseKpis.total_vendas, compKpis.total_vendas);
  const deltaQtd = getDelta(baseKpis.qtd_vendas, compKpis.qtd_vendas);
  const deltaTicket = getDelta(baseKpis.ticket_medio, compKpis.ticket_medio);
  const deltaComissoes = getDelta(baseKpis.total_comissoes, compKpis.total_comissoes);

  // Overlaid timeline chart data
  const combinedTimeline = useMemo(() => {
    const daysMap: Record<number, { day: number; label: string; baseTotal: number; compareTotal: number; baseCount: number; compareCount: number }> = {};

    for (let d = 1; d <= 31; d++) {
      daysMap[d] = {
        day: d,
        label: `Dia ${String(d).padStart(2, "0")}`,
        baseTotal: 0,
        compareTotal: 0,
        baseCount: 0,
        compareCount: 0,
      };
    }

    (baseData?.timeline || []).forEach((t) => {
      const parts = t.date.split("-");
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        if (daysMap[d]) {
          daysMap[d].baseTotal = t.total;
          daysMap[d].baseCount = t.count;
        }
      }
    });

    (compareData?.timeline || []).forEach((t) => {
      const parts = t.date.split("-");
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        if (daysMap[d]) {
          daysMap[d].compareTotal = t.total;
          daysMap[d].compareCount = t.count;
        }
      }
    });

    return Object.values(daysMap);
  }, [baseData?.timeline, compareData?.timeline]);

  // Combined Sellers Ranking
  const sellerComparison = useMemo(() => {
    const sellersMap: Record<
      string,
      {
        vendedor: string;
        baseTotal: number;
        baseQtd: number;
        baseComissao: number;
        compTotal: number;
        compQtd: number;
        compComissao: number;
      }
    > = {};

    (baseData?.ranking || []).forEach((r) => {
      sellersMap[r.vendedor] = {
        vendedor: r.vendedor,
        baseTotal: r.total,
        baseQtd: r.qtd_vendas,
        baseComissao: r.comissao,
        compTotal: 0,
        compQtd: 0,
        compComissao: 0,
      };
    });

    (compareData?.ranking || []).forEach((r) => {
      if (!sellersMap[r.vendedor]) {
        sellersMap[r.vendedor] = {
          vendedor: r.vendedor,
          baseTotal: 0,
          baseQtd: 0,
          baseComissao: 0,
          compTotal: r.total,
          compQtd: r.qtd_vendas,
          compComissao: r.comissao,
        };
      } else {
        sellersMap[r.vendedor].compTotal = r.total;
        sellersMap[r.vendedor].compQtd = r.qtd_vendas;
        sellersMap[r.vendedor].compComissao = r.comissao;
      }
    });

    return Object.values(sellersMap).sort((a, b) => b.baseTotal - a.baseTotal);
  }, [baseData?.ranking, compareData?.ranking]);

  // Combined Departments
  const deptComparison = useMemo(() => {
    const deptsMap: Record<string, { departamento: string; baseTotal: number; compTotal: number }> = {};

    (baseData?.departamentos || []).forEach((d) => {
      deptsMap[d.departamento] = {
        departamento: d.departamento,
        baseTotal: d.total,
        compTotal: 0,
      };
    });

    (compareData?.departamentos || []).forEach((d) => {
      if (!deptsMap[d.departamento]) {
        deptsMap[d.departamento] = {
          departamento: d.departamento,
          baseTotal: 0,
          compTotal: d.total,
        };
      } else {
        deptsMap[d.departamento].compTotal = d.total;
      }
    });

    return Object.values(deptsMap).sort((a, b) => b.baseTotal - a.baseTotal);
  }, [baseData?.departamentos, compareData?.departamentos]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── TOP CONTROL BANNER ────────────────────────────────────────── */}
      <Card className="border-primary/30 bg-gradient-to-r from-card via-card to-primary/5 shadow-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {/* Top row: Title and Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                  <LucideArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Comparativo de Meses
                    </h2>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold text-[10px] uppercase">
                      Cockpit
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione livremente os dois meses que deseja confrontar para análise de crescimento e variações.
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors self-start md:self-auto"
              >
                <LucideX className="w-4 h-4" />
                <span>Fechar Comparativo</span>
              </Button>
            </div>

            {/* Bottom row: Month Selectors and Presets */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Selectors Group */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector Mês 1 (Base) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                    Mês 1 (Base)
                  </label>
                  <Select
                    value={`${baseMonth.year}-${baseMonth.month}`}
                    onValueChange={(val) => {
                      if (onBaseMonthChange) {
                        const [y, m] = val.split("-").map(Number);
                        onBaseMonthChange({ year: y, month: m });
                      }
                    }}
                    disabled={!onBaseMonthChange}
                  >
                    <SelectTrigger className="w-[180px] h-9 bg-background/80 border-teal-500/40 text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Mês Base" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {availableMonthOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap button */}
                <div className="pt-4">
                  <Button
                    onClick={swapMonths}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-border bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-secondary shrink-0 shadow-sm"
                    title="Inverter ordem dos meses"
                  >
                    <LucideArrowLeftRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selector Mês 2 (Comparativo) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Mês 2 (Comparar com)
                  </label>
                  <Select
                    value={`${compareMonth.year}-${compareMonth.month}`}
                    onValueChange={(val) => {
                      const [y, m] = val.split("-").map(Number);
                      onCompareMonthChange({ year: y, month: m });
                    }}
                  >
                    <SelectTrigger className="w-[180px] h-9 bg-background/80 border-border text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Mês Comparado" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {availableMonthOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 self-start xl:self-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                  Atalhos:
                </span>
                <Button
                  onClick={setPreviousMonthPreset}
                  variant={isPreviousMonthActive ? "default" : "secondary"}
                  size="sm"
                  className="h-9 text-xs font-semibold shadow-sm"
                >
                  Mês Anterior
                </Button>
                <Button
                  onClick={setPreviousYearPreset}
                  variant={isPreviousYearActive ? "default" : "secondary"}
                  size="sm"
                  className="h-9 text-xs font-semibold shadow-sm"
                >
                  Mesmo Mês (Ano Anterior)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI CARDS COMPARISON ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Vendas */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <LucideDollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Faturamento Total
                </span>
              </div>
              {deltaVendas.isPositive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowUpRight className="w-3.5 h-3.5" />
                  +{deltaVendas.percent.toFixed(1)}%
                </Badge>
              ) : deltaVendas.isNegative ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowDownRight className="w-3.5 h-3.5" />
                  {deltaVendas.percent.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                  <LucideMinus className="w-3 h-3" /> 0%
                </Badge>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {formatBRL(baseKpis.total_vendas)}
            </p>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>{compareLabel}:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {isLoadingCompare ? <Skeleton className="w-16 h-4" /> : formatBRL(compKpis.total_vendas)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Diferença:</span>
              <span className={`font-bold tabular-nums ${deltaVendas.isPositive ? "text-emerald-600 dark:text-emerald-400" : deltaVendas.isNegative ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {deltaVendas.diff > 0 ? `+${formatBRL(deltaVendas.diff)}` : formatBRL(deltaVendas.diff)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Qtd Vendas */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <LucideShoppingCart className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Qtd. de Pedidos
                </span>
              </div>
              {deltaQtd.isPositive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowUpRight className="w-3.5 h-3.5" />
                  +{deltaQtd.percent.toFixed(1)}%
                </Badge>
              ) : deltaQtd.isNegative ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowDownRight className="w-3.5 h-3.5" />
                  {deltaQtd.percent.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                  <LucideMinus className="w-3 h-3" /> 0%
                </Badge>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {formatNumber(baseKpis.qtd_vendas)}
            </p>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>{compareLabel}:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {isLoadingCompare ? <Skeleton className="w-12 h-4" /> : formatNumber(compKpis.qtd_vendas)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Diferença:</span>
              <span className={`font-bold tabular-nums ${deltaQtd.isPositive ? "text-emerald-600 dark:text-emerald-400" : deltaQtd.isNegative ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {deltaQtd.diff > 0 ? `+${formatNumber(deltaQtd.diff)} pedidos` : `${formatNumber(deltaQtd.diff)} pedidos`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <LucideTrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Ticket Médio
                </span>
              </div>
              {deltaTicket.isPositive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowUpRight className="w-3.5 h-3.5" />
                  +{deltaTicket.percent.toFixed(1)}%
                </Badge>
              ) : deltaTicket.isNegative ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowDownRight className="w-3.5 h-3.5" />
                  {deltaTicket.percent.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                  <LucideMinus className="w-3 h-3" /> 0%
                </Badge>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {formatBRL(baseKpis.ticket_medio)}
            </p>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>{compareLabel}:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {isLoadingCompare ? <Skeleton className="w-16 h-4" /> : formatBRL(compKpis.ticket_medio)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Diferença:</span>
              <span className={`font-bold tabular-nums ${deltaTicket.isPositive ? "text-emerald-600 dark:text-emerald-400" : deltaTicket.isNegative ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {deltaTicket.diff > 0 ? `+${formatBRL(deltaTicket.diff)}` : formatBRL(deltaTicket.diff)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Comissões */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <LucideUsers className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Comissões
                </span>
              </div>
              {deltaComissoes.isPositive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowUpRight className="w-3.5 h-3.5" />
                  +{deltaComissoes.percent.toFixed(1)}%
                </Badge>
              ) : deltaComissoes.isNegative ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-bold">
                  <LucideArrowDownRight className="w-3.5 h-3.5" />
                  {deltaComissoes.percent.toFixed(1)}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                  <LucideMinus className="w-3 h-3" /> 0%
                </Badge>
              )}
            </div>

            <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
              {formatBRL(baseKpis.total_comissoes)}
            </p>

            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>{compareLabel}:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {isLoadingCompare ? <Skeleton className="w-16 h-4" /> : formatBRL(compKpis.total_comissoes)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Diferença:</span>
              <span className={`font-bold tabular-nums ${deltaComissoes.isPositive ? "text-emerald-600 dark:text-emerald-400" : deltaComissoes.isNegative ? "text-rose-600 dark:text-rose-400" : ""}`}>
                {deltaComissoes.diff > 0 ? `+${formatBRL(deltaComissoes.diff)}` : formatBRL(deltaComissoes.diff)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── OVERLAID TIMELINE CHART ──────────────────────────────────── */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LucideTrendingUp className="w-4 h-4 text-primary" />
              Evolução Diária Comparativa (Dia 1 ao 31)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparação da curva diária de vendas entre <strong className="text-teal-600 dark:text-teal-400">{baseLabel}</strong> e <strong className="text-slate-500 dark:text-slate-400">{compareLabel}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-600 dark:bg-teal-400 inline-block" />
              <span className="text-foreground">{baseLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
              <span className="text-muted-foreground">{compareLabel}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={combinedTimeline} margin={{ left: 0, right: 16, top: 12, bottom: 4 }}>
                <defs>
                  <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="compareGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                />
                <Tooltip
                  formatter={(val: number, name: string) => [
                    formatBRL(val),
                    name === "baseTotal" ? baseLabel : compareLabel,
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="compareTotal"
                  name="compareTotal"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#compareGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="baseTotal"
                  name="baseTotal"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fill="url(#baseGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── SIDE BY SIDE: SELLERS & DEPARTMENTS COMPARISON ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sellers Comparison */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LucideUsers className="w-4 h-4 text-primary" />
                Desempenho por Vendedor
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {sellerComparison.length} vendedores
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
              {sellerComparison.map((seller, index) => {
                const delta = getDelta(seller.baseTotal, seller.compTotal);
                return (
                  <div key={seller.vendedor} className="p-3.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center shrink-0 border border-border">
                        #{index + 1}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{seller.vendedor}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatNumber(seller.baseQtd)} pedidos no mês base
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground tabular-nums">
                        {formatBRL(seller.baseTotal)}
                      </p>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          vs {formatBRL(seller.compTotal)}
                        </span>
                        {delta.isPositive ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            +{delta.percent.toFixed(0)}%
                          </span>
                        ) : delta.isNegative ? (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            {delta.percent.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">0%</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Departments Comparison */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LucideLayers className="w-4 h-4 text-primary" />
                Desempenho por Departamento
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {deptComparison.length} categorias
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40 max-h-[420px] overflow-y-auto">
              {deptComparison.map((dept) => {
                const delta = getDelta(dept.baseTotal, dept.compTotal);
                return (
                  <div key={dept.departamento} className="p-3.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{dept.departamento || "Não informado"}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>Base: {formatBRL(dept.baseTotal)}</span>
                        <span>•</span>
                        <span>Comp: {formatBRL(dept.compTotal)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {delta.isPositive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-bold">
                          <LucideArrowUpRight className="w-3 h-3" />
                          +{delta.percent.toFixed(1)}% (+{formatBRL(delta.diff)})
                        </Badge>
                      ) : delta.isNegative ? (
                        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[10px] font-bold">
                          <LucideArrowDownRight className="w-3 h-3" />
                          {delta.percent.toFixed(1)}% ({formatBRL(delta.diff)})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          0%
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
