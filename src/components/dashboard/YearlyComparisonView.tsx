import React, { useState } from "react";
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
  TrendingUp,
  X,
  ArrowLeftRight,
  Calendar,
  Sparkles,
  BarChart2,
  LineChart as LineChartIcon,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  useYearlyComparison,
  type YearlyMonthComparison,
} from "@/hooks/useYearlyComparison";

interface YearlyComparisonViewProps {
  store: "sobral" | "itapipoca" | "consolidado";
  baseYear: number;
  compareYear: number;
  onBaseYearChange: (year: number) => void;
  onCompareYearChange: (year: number) => void;
  onClose: () => void;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatCompactBRL(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatBRL(value);
}

export default function YearlyComparisonView({
  store,
  baseYear,
  compareYear,
  onBaseYearChange,
  onCompareYearChange,
  onClose,
}: YearlyComparisonViewProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const { data, isLoading, isError } = useYearlyComparison(
    store,
    baseYear,
    compareYear
  );

  const availableYears = [2026, 2025, 2024, 2023];

  const handleSwapYears = () => {
    const currentBase = baseYear;
    onBaseYearChange(compareYear);
    onCompareYearChange(currentBase);
  };

  const setPreset = (bY: number, cY: number) => {
    onBaseYearChange(bY);
    onCompareYearChange(cY);
  };

  const isPresetActive = (bY: number, cY: number) =>
    baseYear === bY && compareYear === cY;

  const summary = data?.summary;
  const months = data?.months || [];

  const storeLabels: Record<string, string> = {
    sobral: "Sobral",
    itapipoca: "Itapipoca",
    consolidado: "Consolidado (Sobral + Itapipoca)",
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    );
  }

  const isPositiveGrowth = (summary?.taxaCrescimentoAnual || 0) > 0;
  const isNegativeGrowth = (summary?.taxaCrescimentoAnual || 0) < 0;

  // Chart dataset
  const chartData = months.map((m) => ({
    name: m.siglaMes,
    nomeCompleto: m.nomeMes,
    [baseYear.toString()]: m.baseValor,
    [compareYear.toString()]: m.compareValor,
    diferenca: m.diferenca,
    crescimento: m.crescimentoPercentual,
  }));

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
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Comparativo Ano a Ano (YoY)
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/30 font-semibold text-[10px] uppercase"
                    >
                      {storeLabels[store]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors self-start md:self-auto"
              >
                <X className="w-4 h-4" />
                <span>Fechar Comparativo</span>
              </Button>
            </div>

            {/* Bottom row: Year Selectors and Quick Presets */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Selectors Group */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Selector Ano Base */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                    Ano Atual (Base)
                  </label>
                  <Select
                    value={baseYear.toString()}
                    onValueChange={(val) => onBaseYearChange(Number(val))}
                  >
                    <SelectTrigger className="w-[140px] h-9 bg-background/80 border-teal-500/40 text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Ano Base" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={y.toString()} className="text-xs font-medium">
                          Ano {y} {y >= 2026 ? "(Ao Vivo)" : "(Histórico)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Swap button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSwapYears}
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-border bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-secondary shrink-0 shadow-sm"
                    title="Inverter ordem dos anos"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selector Ano Comparado */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    Ano Anterior (Comparar com)
                  </label>
                  <Select
                    value={compareYear.toString()}
                    onValueChange={(val) => onCompareYearChange(Number(val))}
                  >
                    <SelectTrigger className="w-[140px] h-9 bg-background/80 border-border text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Ano Comparado" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={y.toString()} className="text-xs font-medium">
                          Ano {y} {y >= 2026 ? "(Ao Vivo)" : "(Histórico)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start xl:self-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                  Atalhos:
                </span>
                <Button
                  onClick={() => setPreset(2026, 2025)}
                  variant={isPresetActive(2026, 2025) ? "default" : "secondary"}
                  size="sm"
                  className="h-9 text-xs font-semibold shadow-sm"
                >
                  2026 vs 2025
                </Button>
                <Button
                  onClick={() => setPreset(2025, 2024)}
                  variant={isPresetActive(2025, 2024) ? "default" : "secondary"}
                  size="sm"
                  className="h-9 text-xs font-semibold shadow-sm"
                >
                  2025 vs 2024
                </Button>
                <Button
                  onClick={() => setPreset(2024, 2023)}
                  variant={isPresetActive(2024, 2023) ? "default" : "secondary"}
                  size="sm"
                  className="h-9 text-xs font-semibold shadow-sm"
                >
                  2024 vs 2023
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI HERO CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Ano Atual */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Faturamento {baseYear}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30">
                {baseYear >= 2026 ? "Ao Vivo" : "Histórico"}
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatBRL(summary?.baseTotal || 0)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Média mensal: {formatBRL(summary?.mediaMensalBase || 0)}</span>
              {summary?.melhorMesBase && summary.melhorMesBase.valor > 0 && (
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                  Pico: {summary.melhorMesBase.nomeMes}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Faturamento Ano Anterior */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Faturamento {compareYear}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                {compareYear >= 2026 ? "Ao Vivo" : "Histórico"}
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground/80 tabular-nums">
              {formatBRL(summary?.compareTotal || 0)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Média mensal: {formatBRL(summary?.mediaMensalCompare || 0)}</span>
              {summary?.melhorMesCompare && summary.melhorMesCompare.valor > 0 && (
                <span className="text-[11px] font-medium">
                  Pico: {summary.melhorMesCompare.nomeMes}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Diferença Absoluta em R$ */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Diferença Nominal
                </span>
              </div>
              {isPositiveGrowth ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-bold">
                  <ArrowUpRight className="w-3 h-3" /> Superior
                </Badge>
              ) : isNegativeGrowth ? (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[10px] font-bold">
                  <ArrowDownRight className="w-3 h-3" /> Inferior
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  Estável
                </Badge>
              )}
            </div>
            <p
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                isPositiveGrowth
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isNegativeGrowth
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {(summary?.diferencaTotal || 0) > 0 ? "+" : ""}
              {formatBRL(summary?.diferencaTotal || 0)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {baseYear} em relação a {compareYear}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Taxa de Crescimento YoY (%) */}
        <Card
          className={`border bg-card shadow-sm hover:shadow-md transition-shadow ${
            isPositiveGrowth
              ? "border-emerald-500/30 bg-emerald-500/[0.03]"
              : isNegativeGrowth
              ? "border-rose-500/30 bg-rose-500/[0.03]"
              : "border-border"
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Crescimento YoY
                </span>
              </div>
              <Badge
                className={`gap-1 text-xs font-extrabold px-2 py-0.5 ${
                  isPositiveGrowth
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                    : isNegativeGrowth
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {isPositiveGrowth ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : isNegativeGrowth ? (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {isPositiveGrowth ? "+" : ""}
                {(summary?.taxaCrescimentoAnual || 0).toFixed(2)}%
              </Badge>
            </div>
            <p
              className={`text-3xl font-extrabold tracking-tight tabular-nums leading-none ${
                isPositiveGrowth
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isNegativeGrowth
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-foreground"
              }`}
            >
              {isPositiveGrowth ? "+" : ""}
              {(summary?.taxaCrescimentoAnual || 0).toFixed(1)}%
            </p>
            {/* Se baseYear for 2026 e tiver meses em aberto, exibe também o YTD */}
            {summary && summary.ytdMesesQtd > 0 && summary.ytdMesesQtd < 12 && (
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  Mesmo período (Jan-{months[summary.ytdMesesQtd - 1]?.siglaMes}):
                </span>
                <span
                  className={`font-bold ${
                    summary.ytdTaxaCrescimento > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {summary.ytdTaxaCrescimento > 0 ? "+" : ""}
                  {summary.ytdTaxaCrescimento.toFixed(1)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── GRAFICO COMPARATIVO MENSAL (JAN A DEZ) ────────────────────── */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40">
          <div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Evolução Mensal Comparativa: {baseYear} vs {compareYear}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trajetória de vendas de Janeiro a Dezembro confrontando os dois anos
            </p>
          </div>

          <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border shrink-0 self-start sm:self-auto">
            <Button
              variant={chartType === "area" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setChartType("area")}
              className="h-7 text-xs font-semibold px-2.5 gap-1 shadow-none"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Área
            </Button>
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
              className="h-7 text-xs font-semibold px-2.5 gap-1 shadow-none"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Barras
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-4">
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="baseYearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="compYearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(215, 25%, 55%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(215, 25%, 55%)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompactBRL(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const cur = payload.find((p) => p.dataKey === baseYear.toString())?.value as number || 0;
                      const prev = payload.find((p) => p.dataKey === compareYear.toString())?.value as number || 0;
                      const diff = cur - prev;
                      const pct = prev > 0 ? ((cur / prev) - 1) * 100 : cur > 0 ? 100 : 0;

                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs space-y-2 min-w-[200px]">
                          <p className="font-bold text-foreground border-b border-border pb-1">
                            {payload[0]?.payload?.nomeCompleto || label}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-teal-500" />
                              {baseYear}:
                            </span>
                            <span className="font-bold text-foreground">{formatBRL(cur)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              {compareYear}:
                            </span>
                            <span className="font-bold text-foreground/80">{formatBRL(prev)}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Variação:</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                diff > 0
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : diff < 0
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {pct.toFixed(1)}% ({formatBRL(diff)})
                            </Badge>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey={compareYear.toString()}
                    name={`Ano ${compareYear}`}
                    stroke="hsl(215, 25%, 55%)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#compYearGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey={baseYear.toString()}
                    name={`Ano ${baseYear}`}
                    stroke="hsl(172, 66%, 40%)"
                    strokeWidth={2.5}
                    fill="url(#baseYearGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompactBRL(v)}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const cur = payload.find((p) => p.dataKey === baseYear.toString())?.value as number || 0;
                      const prev = payload.find((p) => p.dataKey === compareYear.toString())?.value as number || 0;
                      const diff = cur - prev;
                      const pct = prev > 0 ? ((cur / prev) - 1) * 100 : cur > 0 ? 100 : 0;

                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs space-y-2 min-w-[200px]">
                          <p className="font-bold text-foreground border-b border-border pb-1">
                            {payload[0]?.payload?.nomeCompleto || label}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">{baseYear}:</span>
                            <span className="font-bold text-foreground">{formatBRL(cur)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground font-medium">{compareYear}:</span>
                            <span className="font-bold text-foreground/80">{formatBRL(prev)}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Variação:</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                diff > 0
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : diff < 0
                                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {pct.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                  />
                  <Bar
                    dataKey={compareYear.toString()}
                    name={`Ano ${compareYear}`}
                    fill="hsl(215, 25%, 65%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey={baseYear.toString()}
                    name={`Ano ${baseYear}`}
                    fill="hsl(172, 66%, 40%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── TABELA ANALITICA MÊS A MÊS ────────────────────────────────── */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Detalhamento Analítico Mensal (12 Meses)
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Valores expressos em Real (BRL)
            </span>
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-5">Mês</th>
                <th className="p-3 text-right">Faturamento {baseYear}</th>
                <th className="p-3 text-right">Faturamento {compareYear}</th>
                <th className="p-3 text-right">Variação (R$)</th>
                <th className="p-3 text-right pr-5">Taxa de Crescimento (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {months.map((m) => {
                const hasBoth = m.baseValor > 0 && m.compareValor > 0;
                const hasOnlyBase = m.baseValor > 0 && m.compareValor === 0;
                const hasOnlyCompare = m.baseValor === 0 && m.compareValor > 0;
                const hasNone = m.baseValor === 0 && m.compareValor === 0;

                return (
                  <tr
                    key={m.mes}
                    className="hover:bg-muted/30 transition-colors font-medium"
                  >
                    <td className="p-3 pl-5 font-semibold text-foreground flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {String(m.mes).padStart(2, "0")}
                      </span>
                      {m.nomeMes}
                    </td>

                    {/* Faturamento Base */}
                    <td className="p-3 text-right tabular-nums text-foreground font-semibold">
                      {m.baseValor > 0 ? formatBRL(m.baseValor) : <span className="text-muted-foreground/40">-</span>}
                    </td>

                    {/* Faturamento Compare */}
                    <td className="p-3 text-right tabular-nums text-foreground/80">
                      {m.compareValor > 0 ? formatBRL(m.compareValor) : <span className="text-muted-foreground/40">-</span>}
                    </td>

                    {/* Diferença R$ */}
                    <td className="p-3 text-right tabular-nums">
                      {hasNone ? (
                        <span className="text-muted-foreground/40">-</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            m.isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : m.isNegative
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {m.diferenca > 0 ? "+" : ""}
                          {formatBRL(m.diferenca)}
                        </span>
                      )}
                    </td>

                    {/* Taxa de Crescimento % */}
                    <td className="p-3 text-right pr-5 tabular-nums">
                      {hasNone ? (
                        <span className="text-muted-foreground/40 text-[11px]">Sem dados</span>
                      ) : hasOnlyBase ? (
                        <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 text-[10px] font-bold">
                          Novo Período
                        </Badge>
                      ) : (
                        <Badge
                          className={`gap-1 text-[11px] font-bold px-2 py-0.5 ${
                            m.isPositive
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : m.isNegative
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {m.isPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : m.isNegative ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {m.isPositive ? "+" : ""}
                          {m.crescimentoPercentual.toFixed(1)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Rodapé Total */}
            <tfoot>
              <tr className="bg-secondary/60 border-t-2 border-border font-bold text-xs">
                <td className="p-3.5 pl-5 uppercase tracking-wider text-foreground">
                  TOTAL DO ANO
                </td>
                <td className="p-3.5 text-right tabular-nums text-foreground font-extrabold text-sm">
                  {formatBRL(summary?.baseTotal || 0)}
                </td>
                <td className="p-3.5 text-right tabular-nums text-foreground/80 font-bold text-sm">
                  {formatBRL(summary?.compareTotal || 0)}
                </td>
                <td
                  className={`p-3.5 text-right tabular-nums font-extrabold text-sm ${
                    isPositiveGrowth
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isNegativeGrowth
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {(summary?.diferencaTotal || 0) > 0 ? "+" : ""}
                  {formatBRL(summary?.diferencaTotal || 0)}
                </td>
                <td className="p-3.5 text-right pr-5 tabular-nums">
                  <Badge
                    className={`gap-1 text-xs font-black px-2.5 py-1 ${
                      isPositiveGrowth
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                        : isNegativeGrowth
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {isPositiveGrowth ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : isNegativeGrowth ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    {isPositiveGrowth ? "+" : ""}
                    {(summary?.taxaCrescimentoAnual || 0).toFixed(2)}%
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
