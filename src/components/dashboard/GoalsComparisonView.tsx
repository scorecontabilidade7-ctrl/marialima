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
  Target,
  DollarSign,
  TrendingUp,
  X,
  Calendar,
  BarChart2,
  LineChart as LineChartIcon,
  Percent,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  useGoalsComparison,
  type GoalType,
  type MonthlyGoalComparisonItem,
} from "@/hooks/useGoalsComparison";

interface GoalsComparisonViewProps {
  store: "sobral" | "itapipoca" | "consolidado";
  initialYear?: number;
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

const GOAL_TYPE_OPTIONS: { key: GoalType; label: string; desc: string }[] = [
  { key: "esperado", label: "Meta Esperada (Crescimento)", desc: "Meta projetada com taxa de crescimento anual" },
  { key: "minima", label: "Meta Mínima", desc: "Patamar mínimo estipulado" },
  { key: "top1", label: "Meta Top 1", desc: "Primeiro nível de premiação" },
  { key: "top2", label: "Meta Top 2", desc: "Segundo nível de premiação" },
  { key: "master", label: "Meta Master", desc: "Nível máximo de excelência" },
];

export default function GoalsComparisonView({
  store,
  initialYear = 2026,
  onClose,
}: GoalsComparisonViewProps) {
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedGoalType, setSelectedGoalType] = useState<GoalType>("esperado");
  const [chartType, setChartType] = useState<"bar" | "area">("bar");

  const { data, isLoading } = useGoalsComparison(
    store,
    selectedYear,
    selectedGoalType
  );

  const availableYears = [2026, 2025, 2024, 2023];

  const storeLabels: Record<string, string> = {
    sobral: "Sobral",
    itapipoca: "Itapipoca",
    consolidado: "Consolidado (Sobral + Itapipoca)",
  };

  const summary = data?.summaryAno;
  const months = data?.months || [];
  const historicoAnual = data?.historicoAnual || [];

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

  const isPositive = (summary?.taxaVariacaoTotal || 0) >= 0;
  const isNegative = (summary?.taxaVariacaoTotal || 0) < 0;

  // Chart dataset
  const chartData = months.map((m) => ({
    name: m.siglaMes,
    nomeCompleto: m.nomeMes,
    Meta: m.metaValor,
    Realizado: m.realizadoValor,
    diferenca: m.diferenca,
    variacao: m.variacaoPercentual,
    atingimento: m.atingimentoPercentual,
    isHit: m.isHit,
    hasSales: m.hasSales,
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
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      Comparativo de Metas
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/30 font-semibold text-[10px] uppercase"
                    >
                      {storeLabels[store]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Confronte o faturamento realizado contra as metas projetadas de 2023 a 2026 e analise a taxa de superação (+) ou déficit (-).
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
                <X className="w-4 h-4" />
                <span>Fechar Comparativo</span>
              </Button>
            </div>

            {/* Bottom row: Year Selector, Goal Type and Year Shortcuts */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              {/* Selectors Group */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Seletor de Ano */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-primary" />
                    Ano de Análise
                  </label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(val) => setSelectedYear(Number(val))}
                  >
                    <SelectTrigger className="w-[140px] h-9 bg-background/80 border-primary/40 text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Ano" />
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

                {/* Seletor do Tipo de Meta */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <Award className="w-3 h-3 text-primary" />
                    Tipo de Meta
                  </label>
                  <Select
                    value={selectedGoalType}
                    onValueChange={(val) => setSelectedGoalType(val as GoalType)}
                  >
                    <SelectTrigger className="w-[230px] h-9 bg-background/80 border-border text-foreground font-semibold text-xs shadow-sm">
                      <SelectValue placeholder="Tipo de Meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key} className="text-xs">
                          <span className="font-semibold">{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Year Shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 self-start xl:self-end">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline">
                  Anos:
                </span>
                {availableYears.map((y) => (
                  <Button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    variant={selectedYear === y ? "default" : "secondary"}
                    size="sm"
                    className="h-9 text-xs font-semibold shadow-sm px-3"
                  >
                    {y}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI HERO CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Meta Projetada */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Meta {selectedYear}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                {GOAL_TYPE_OPTIONS.find((g) => g.key === selectedGoalType)?.label.split(" ")[0]}
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground/80 tabular-nums">
              {formatBRL(summary?.metaTotal || 0)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Média mensal: {formatBRL((summary?.metaTotal || 0) / 12)}</span>
              <span>12 Meses</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Faturamento Realizado */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Realizado {selectedYear}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30">
                {selectedYear >= 2026 ? "Ao Vivo" : "Histórico"}
              </Badge>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatBRL(summary?.realizadoTotal || 0)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Média mensal: {formatBRL((summary?.realizadoTotal || 0) / 12)}</span>
              <span className="text-teal-600 dark:text-teal-400 font-semibold">
                {summary?.mesesBatidos || 0} meses batidos
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Lucro / Superávit vs Meta (Diferença R$) */}
        <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Superávit / Déficit
                </span>
              </div>
              {isPositive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px] font-bold">
                  <ArrowUpRight className="w-3 h-3" /> Lucro vs Meta
                </Badge>
              ) : (
                <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 text-[10px] font-bold">
                  <ArrowDownRight className="w-3 h-3" /> Abaixo da Meta
                </Badge>
              )}
            </div>
            <p
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {(summary?.diferencaTotal || 0) > 0 ? "+" : ""}
              {formatBRL(summary?.diferencaTotal || 0)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground truncate">
              {isPositive ? "Faturamento superou o planejado" : "Faturamento ficou aquém da meta"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Taxa de Variação / Crescimento vs Meta (%) */}
        <Card
          className={`border bg-card shadow-sm hover:shadow-md transition-shadow ${
            isPositive
              ? "border-emerald-500/30 bg-emerald-500/[0.03]"
              : "border-rose-500/30 bg-rose-500/[0.03]"
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Taxa vs Meta
                </span>
              </div>
              <Badge
                className={`gap-1 text-xs font-extrabold px-2 py-0.5 ${
                  isPositive
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {isPositive ? "BATEU " : "NÃO BATEU "}
                {isPositive ? "+" : ""}
                {(summary?.taxaVariacaoTotal || 0).toFixed(1)}%
              </Badge>
            </div>
            <p
              className={`text-3xl font-extrabold tracking-tight tabular-nums leading-none ${
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {(summary?.taxaVariacaoTotal || 0).toFixed(1)}%
            </p>
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Atingimento da Meta:</span>
              <span className="font-bold text-foreground">
                {(summary?.atingimentoTotal || 0).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── GRAFICO COMPARATIVO MENSAL DE METAS ────────────────────────── */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40">
          <div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Meta Projetada vs Faturamento Realizado ({selectedYear})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confronto mensal entre a meta planejada e o faturamento alcançado
            </p>
          </div>

          <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border shrink-0 self-start sm:self-auto">
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setChartType("bar")}
              className="h-7 text-xs font-semibold px-2.5 gap-1 shadow-none"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Barras
            </Button>
            <Button
              variant={chartType === "area" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setChartType("area")}
              className="h-7 text-xs font-semibold px-2.5 gap-1 shadow-none"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Área
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-4">
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
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
                      const meta = payload.find((p) => p.dataKey === "Meta")?.value as number || 0;
                      const real = payload.find((p) => p.dataKey === "Realizado")?.value as number || 0;
                      const diff = real - meta;
                      const pct = meta > 0 ? ((real / meta) - 1) * 100 : 0;
                      const isHit = diff >= 0 && real > 0;

                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs space-y-2 min-w-[200px]">
                          <p className="font-bold text-foreground border-b border-border pb-1">
                            {payload[0]?.payload?.nomeCompleto || label} / {selectedYear}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground font-medium">Meta Projetada:</span>
                            <span className="font-bold text-foreground/80">{formatBRL(meta)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">Realizado:</span>
                            <span className="font-bold text-foreground">{formatBRL(real)}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                isHit
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {isHit ? "BATEU +" : "NÃO BATEU "}
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
                  <Bar
                    dataKey="Meta"
                    name="Meta Projetada"
                    fill="hsl(215, 25%, 65%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Realizado"
                    name="Faturamento Realizado"
                    fill="hsl(172, 66%, 40%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              ) : (
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(172, 66%, 40%)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
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
                      const meta = payload.find((p) => p.dataKey === "Meta")?.value as number || 0;
                      const real = payload.find((p) => p.dataKey === "Realizado")?.value as number || 0;
                      const diff = real - meta;
                      const pct = meta > 0 ? ((real / meta) - 1) * 100 : 0;
                      const isHit = diff >= 0 && real > 0;

                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-xs space-y-2 min-w-[200px]">
                          <p className="font-bold text-foreground border-b border-border pb-1">
                            {payload[0]?.payload?.nomeCompleto || label} / {selectedYear}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground font-medium">Meta Projetada:</span>
                            <span className="font-bold text-foreground/80">{formatBRL(meta)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">Realizado:</span>
                            <span className="font-bold text-foreground">{formatBRL(real)}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                isHit
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                              }`}
                            >
                              {isHit ? "BATEU +" : "NÃO BATEU "}
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
                    dataKey="Meta"
                    name="Meta Projetada"
                    stroke="hsl(215, 25%, 55%)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="url(#metaGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Realizado"
                    name="Faturamento Realizado"
                    stroke="hsl(172, 66%, 40%)"
                    strokeWidth={2.5}
                    fill="url(#realGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── TABELA ANALITICA MÊS A MÊS (JAN A DEZ) ────────────────────── */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Detalhamento Mensal de Metas vs Realizado ({selectedYear})
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
                <th className="p-3 text-right">Meta Projetada</th>
                <th className="p-3 text-right">Faturamento Realizado</th>
                <th className="p-3 text-right">Superávit / Déficit (R$)</th>
                <th className="p-3 text-center">Atingimento</th>
                <th className="p-3 text-right pr-5">Status & Taxa vs Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {months.map((m) => {
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

                    {/* Meta */}
                    <td className="p-3 text-right tabular-nums text-foreground/80 font-semibold">
                      {formatBRL(m.metaValor)}
                    </td>

                    {/* Realizado */}
                    <td className="p-3 text-right tabular-nums text-foreground font-bold">
                      {m.realizadoValor > 0 ? formatBRL(m.realizadoValor) : <span className="text-muted-foreground/40">-</span>}
                    </td>

                    {/* Diferença R$ */}
                    <td className="p-3 text-right tabular-nums">
                      {!m.hasSales ? (
                        <span className="text-muted-foreground/40">-</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            m.isHit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {m.diferenca > 0 ? "+" : ""}
                          {formatBRL(m.diferenca)}
                        </span>
                      )}
                    </td>

                    {/* Atingimento % */}
                    <td className="p-3 text-center tabular-nums">
                      {!m.hasSales ? (
                        <span className="text-muted-foreground/40">-</span>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {m.atingimentoPercentual.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    {/* Status & Taxa vs Meta */}
                    <td className="p-3 text-right pr-5 tabular-nums">
                      {!m.hasSales ? (
                        <span className="text-muted-foreground/40 text-[11px]">Sem dados</span>
                      ) : (
                        <Badge
                          className={`gap-1 text-[11px] font-bold px-2 py-0.5 ${
                            m.isHit
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {m.isHit ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {m.isHit ? "BATEU +" : "NÃO BATEU "}
                          {m.variacaoPercentual.toFixed(1)}%
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
                <td className="p-3.5 text-right tabular-nums text-foreground/80 font-bold text-sm">
                  {formatBRL(summary?.metaTotal || 0)}
                </td>
                <td className="p-3.5 text-right tabular-nums text-foreground font-extrabold text-sm">
                  {formatBRL(summary?.realizadoTotal || 0)}
                </td>
                <td
                  className={`p-3.5 text-right tabular-nums font-extrabold text-sm ${
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {(summary?.diferencaTotal || 0) > 0 ? "+" : ""}
                  {formatBRL(summary?.diferencaTotal || 0)}
                </td>
                <td className="p-3.5 text-center tabular-nums text-foreground font-bold text-sm">
                  {(summary?.atingimentoTotal || 0).toFixed(1)}%
                </td>
                <td className="p-3.5 text-right pr-5 tabular-nums">
                  <Badge
                    className={`gap-1 text-xs font-black px-2.5 py-1 ${
                      isPositive
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {isPositive ? "BATEU +" : "NÃO BATEU "}
                    {(summary?.taxaVariacaoTotal || 0).toFixed(2)}%
                  </Badge>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* ── PANORAMA MULTIANUAL (2023 A 2026) ──────────────────────────── */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold tracking-tight text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Panorama Multianual de Metas (2023 a 2026)
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Evolução histórica de metas vs faturamento
            </span>
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-5">Ano</th>
                <th className="p-3 text-right">Meta Total Projetada</th>
                <th className="p-3 text-right">Faturamento Realizado</th>
                <th className="p-3 text-right">Diferença (R$)</th>
                <th className="p-3 text-center">Meses Batidos</th>
                <th className="p-3 text-center">% Atingimento</th>
                <th className="p-3 text-right pr-5">Taxa de Superação vs Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {historicoAnual.map((h) => {
                const isSelected = selectedYear === h.ano;
                return (
                  <tr
                    key={h.ano}
                    onClick={() => setSelectedYear(h.ano)}
                    className={`cursor-pointer transition-colors font-medium ${
                      isSelected ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="p-3 pl-5 font-bold text-foreground flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      Ano {h.ano}
                      {h.ano >= 2026 && (
                        <Badge variant="outline" className="text-[9px] font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30 ml-1">
                          Ao Vivo
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums text-foreground/80 font-semibold">
                      {formatBRL(h.metaTotal)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-foreground font-bold">
                      {formatBRL(h.realizadoTotal)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <span
                        className={`font-semibold ${
                          h.isHit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {h.diferencaTotal > 0 ? "+" : ""}
                        {formatBRL(h.diferencaTotal)}
                      </span>
                    </td>
                    <td className="p-3 text-center tabular-nums font-semibold text-foreground">
                      {h.mesesBatidos} / 12
                    </td>
                    <td className="p-3 text-center tabular-nums font-bold text-foreground">
                      {h.atingimentoTotal.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right pr-5 tabular-nums">
                      <Badge
                        className={`gap-1 text-[11px] font-bold px-2 py-0.5 ${
                          h.isHit
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {h.isHit ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {h.isHit ? "BATEU +" : "NÃO BATEU "}
                        {h.taxaVariacaoTotal.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
