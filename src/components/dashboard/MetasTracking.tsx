import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Award, Star, Trophy } from "lucide-react";
import { useCurrentMonthGoals } from "@/hooks/useMonthlyGoals";
import type { RankingItem, TimelineItem } from "@/hooks/useSalesData";
import { getSellerPhoto } from "@/lib/sellerPhotos";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";

export type MetaKey = "minima" | "top1" | "top2" | "master";

export const META_OPTIONS: { key: MetaKey; label: string }[] = [
  { key: "minima", label: "Meta Mínima" },
  { key: "top1",   label: "Top 1" },
  { key: "top2",   label: "Top 2" },
  { key: "master", label: "Master" },
];

interface MetasTrackingProps {
  ranking: RankingItem[];
  timeline: TimelineItem[];
  selectedMeta: MetaKey;
  onMetaChange: (meta: MetaKey) => void;
  store?: string;
  selectedMonth?: { year: number; month: number };
}

// Commission values per level
const COMISSOES = {
  minima: 140,
  top1: 208,
  top2: 300,
  master: 420,
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatBRLShort(value: number) {
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return formatBRL(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600",
  "bg-purple-600", "bg-teal-600", "bg-orange-600", "bg-indigo-600",
];

function getWeeksOfMonth(year: number, monthIndex: number) {
  const weeks: { label: string; days: Date[] }[] = [];
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));

  let currentWeek: Date[] = [];
  let weekNum = 1;

  for (let d = new Date(firstDay); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day === 0) continue;
    currentWeek.push(new Date(d));
    if (day === 6 || d.getUTCDate() === lastDay.getUTCDate()) {
      weeks.push({ label: `Semana ${weekNum}`, days: [...currentWeek] });
      currentWeek = [];
      weekNum++;
    }
  }

  return weeks;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type DistributionMode = "uniform" | "day" | "week";

type WeekSpec = { label: string; days: Date[] };

function parsePercentArray(value: unknown, expectedLen?: number): number[] | null {
  if (!Array.isArray(value)) return null;
  const nums = value.map((v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  if (expectedLen != null && nums.length !== expectedLen) return null;
  return nums;
}

function buildDayTargetsFromWeekdayPercents(weeks: WeekSpec[], metaMensal: number, weekdayPercents: number[]) {
  const weekdayCounts = [0, 0, 0, 0, 0, 0];
  for (const w of weeks) {
    for (const d of w.days) {
      const dow = d.getUTCDay();
      if (dow >= 1 && dow <= 6) weekdayCounts[dow - 1] += 1;
    }
  }

  const targets: Record<string, number> = {};
  for (const w of weeks) {
    for (const d of w.days) {
      const dow = d.getUTCDay();
      if (dow < 1 || dow > 6) continue;
      const idx = dow - 1;
      const count = weekdayCounts[idx] || 0;
      const pct = weekdayPercents[idx] || 0;
      const key = d.toISOString().slice(0, 10);
      targets[key] = count > 0 ? (metaMensal * (pct / 100)) / count : 0;
    }
  }

  return targets;
}

export default function MetasTracking({ ranking, timeline, selectedMeta, onMetaChange, store = "sobral", selectedMonth }: MetasTrackingProps) {
  const navigate = useNavigate();
  const now = new Date();
  const { year: realYear, month: realMonthNum, day: todayDay } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  
  const isCurrentMonth = !selectedMonth || (selectedMonth.year === realYear && selectedMonth.month === realMonthNum);
  const displayYear = selectedMonth ? selectedMonth.year : realYear;
  const displayMonthNum = selectedMonth ? selectedMonth.month : realMonthNum;
  const displayMonth = displayMonthNum - 1;
  
  const todayUtc = new Date(Date.UTC(realYear, realMonthNum - 1, todayDay, 23, 59, 59, 999));

  const queryParams = new URLSearchParams();
  if (selectedMonth) {
    queryParams.set("year", String(selectedMonth.year));
    queryParams.set("month", String(selectedMonth.month));
  }
  if (store) queryParams.set("store", store);
  const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const targetYearMonth = `${displayYear}-${String(displayMonthNum).padStart(2, "0")}`;
  const { data: goalData } = useCurrentMonthGoals(store, targetYearMonth);

  const METAS_LOJA = useMemo(() => ({
    minima: goalData?.meta_minima ?? 90000,
    top1: goalData?.meta_top1 ?? 110000,
    top2: goalData?.meta_top2 ?? 130000,
    master: goalData?.meta_master ?? 150000,
  }), [goalData]);

  const DIAS_UTEIS_MES = goalData?.dias_uteis ?? 24;

  const sellerTotals = ranking.map(r => ({ name: r.vendedor, total: r.total }));

  const totalRealized = sellerTotals.reduce((s, v) => s + v.total, 0);
  const sellerCount = Math.max(sellerTotals.length, 1);

  const METAS = useMemo(() => ({
    minima: METAS_LOJA.minima / sellerCount,
    top1: METAS_LOJA.top1 / sellerCount,
    top2: METAS_LOJA.top2 / sellerCount,
    master: METAS_LOJA.master / sellerCount,
  }), [METAS_LOJA, sellerCount]);

  const weeks = useMemo(() => getWeeksOfMonth(displayYear, displayMonth), [displayYear, displayMonth]);

  const salesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    timeline.forEach((t) => {
      map[t.date] = t.total;
    });
    return map;
  }, [timeline]);

  const distributionMode = ((goalData as any)?.distribution_mode as DistributionMode | undefined) ?? "uniform";
  const distributionPercentages = (goalData as any)?.distribution_percentages as unknown;

  const metaMensalLoja = METAS_LOJA[selectedMeta];
  const metaDiariaLoja = metaMensalLoja / DIAS_UTEIS_MES;

  const weekPercents = useMemo(
    () => (distributionMode === "week" ? parsePercentArray(distributionPercentages, weeks.length) : null),
    [distributionMode, distributionPercentages, weeks.length],
  );

  const weekdayPercents = useMemo(
    () => (distributionMode === "day" ? parsePercentArray(distributionPercentages, 6) : null),
    [distributionMode, distributionPercentages],
  );

  const dayTargets = useMemo(
    () => (weekdayPercents ? buildDayTargetsFromWeekdayPercents(weeks as WeekSpec[], metaMensalLoja, weekdayPercents) : null),
    [weeks, metaMensalLoja, weekdayPercents],
  );

  const diasUteisCorridos = useMemo(() => {
    if (!isCurrentMonth) return DIAS_UTEIS_MES;
    let count = 0;
    for (let d = 1; d <= todayDay; d++) {
      const date = new Date(Date.UTC(displayYear, displayMonth, d));
      if (date.getUTCDay() !== 0) count++;
    }
    return count;
  }, [isCurrentMonth, todayDay, displayYear, displayMonth, DIAS_UTEIS_MES]);

  const pctMinima = Math.min((totalRealized / METAS_LOJA[selectedMeta]) * 100, 100);
  const projection = diasUteisCorridos > 0 ? (totalRealized / diasUteisCorridos) * DIAS_UTEIS_MES : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Meta Mínima (Loja)", value: METAS_LOJA.minima, sub: `Individual: ${formatBRL(METAS.minima)}`, icon: Target, color: "text-blue-500" },
          { label: "Meta Top 1 (Loja)", value: METAS_LOJA.top1, sub: `Individual: ${formatBRL(METAS.top1)}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Meta Top 2 (Loja)", value: METAS_LOJA.top2, sub: `Individual: ${formatBRL(METAS.top2)}`, icon: Trophy, color: "text-purple-500" },
          { label: "Meta Master (Loja)", value: METAS_LOJA.master, sub: `Individual: ${formatBRL(METAS.master)}`, icon: Star, color: "text-amber-500" },
          { label: "Realizado (Loja)", value: totalRealized, sub: undefined, icon: Award, color: "text-primary" },
        ].map((card) => (
          <Card key={card.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-xl font-bold tracking-tight">{formatBRL(card.value)}</p>
              {card.sub && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>
              )}
              {card.label === "Realizado (Loja)" && (
                <div className="mt-2">
                  <Progress value={pctMinima} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {pctMinima.toFixed(1)}% da {META_OPTIONS.find(m => m.key === selectedMeta)?.label} · Projeção: {formatBRLShort(projection)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vendas/Mês Diferença Table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Vendas/Mês — Diferença para Metas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Vendedora</th>
                  <th className="text-right px-4 py-2.5 font-medium">Valor Realizado</th>
                  <th className="text-right px-4 py-2.5 font-medium">Meta Mínima</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 1</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 2</th>
                  <th className="text-right px-4 py-2.5 font-medium">Master</th>
                </tr>
              </thead>
              <tbody>
                {sellerTotals.map((seller, i) => {
                  const diffs = {
                    minima: seller.total - METAS.minima,
                    top1: seller.total - METAS.top1,
                    top2: seller.total - METAS.top2,
                    master: seller.total - METAS.master,
                  };
                  const photo = getSellerPhoto(seller.name);
                  return (
                    <tr
                      key={seller.name}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/vendedor/${encodeURIComponent(seller.name)}${queryStr}`)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden`}>
                            {photo
                              ? <img src={photo} alt={seller.name} className="w-full h-full object-cover" />
                              : getInitials(seller.name)
                            }
                          </div>
                          <span className="font-medium">{seller.name}</span>
                        </div>
                      </td>
                      <td className="text-right px-4 py-2.5 font-semibold">{formatBRL(seller.total)}</td>
                      {(["minima", "top1", "top2", "master"] as const).map((key) => (
                        <td
                          key={key}
                          className={`text-right px-4 py-2.5 font-semibold ${diffs[key] >= 0 ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {diffs[key] >= 0 ? "+" : ""}
                          {formatBRL(diffs[key])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {sellerTotals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma venda no mês atual</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comissões Table */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Comissões por Nível de Meta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Vendedora</th>
                  <th className="text-right px-4 py-2.5 font-medium">Meta Mínima</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 1</th>
                  <th className="text-right px-4 py-2.5 font-medium">Top 2</th>
                  <th className="text-right px-4 py-2.5 font-medium">Master</th>
                </tr>
              </thead>
              <tbody>
                {sellerTotals.map((seller, i) => {
                  const photo = getSellerPhoto(seller.name);
                  return (
                  <tr
                    key={seller.name}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/vendedor/${encodeURIComponent(seller.name)}${queryStr}`)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden`}>
                          {photo
                            ? <img src={photo} alt={seller.name} className="w-full h-full object-cover" />
                            : getInitials(seller.name)
                          }
                        </div>
                        <span className="font-medium">{seller.name}</span>
                      </div>
                    </td>
                    {(["minima", "top1", "top2", "master"] as const).map((key) => {
                      const reached = seller.total >= METAS[key];
                      return (
                        <td key={key} className={`text-right px-4 py-2.5 font-semibold ${reached ? "text-emerald-600" : "text-red-500"}`}>
                          {reached ? "ATINGIDO" : "NÃO ALCANÇADO"}
                        </td>
                      );
                    })}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly tracking */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">Acompanhamento Semanal</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Meta de referência: <span className="font-semibold text-primary">{META_OPTIONS.find(m => m.key === selectedMeta)?.label}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeks.map((week, weekIndex) => {
            const weekTotal = week.days.reduce((sum, d) => {
              const key = d.toISOString().slice(0, 10);
              return sum + (salesByDate[key] || 0);
            }, 0);

            const weekMeta = (() => {
              if (distributionMode === "week" && weekPercents) {
                const pct = weekPercents[weekIndex] ?? 0;
                return metaMensalLoja * (pct / 100);
              }
              if (distributionMode === "day" && dayTargets) {
                return week.days.reduce((s, d) => s + (dayTargets[d.toISOString().slice(0, 10)] || 0), 0);
              }
              return metaDiariaLoja * week.days.length;
            })();

            const weekPct = weekMeta > 0 ? Math.min((weekTotal / weekMeta) * 100, 100) : 0;

            return (
              <div key={week.label} className="border border-border/50 bg-card rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    {week.label}
                  </h4>
                  {weekTotal >= weekMeta && weekMeta > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      🎯 Meta Superada! ({weekPct.toFixed(0)}%)
                    </span>
                  ) : weekTotal > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      🏃 Faltou {formatBRLShort(weekMeta - weekTotal)} ({weekPct.toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                      😴 Sem vendas ainda
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/50 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Meta Semanal</p>
                    <p className="text-xl font-bold text-foreground leading-none">{formatBRLShort(weekMeta)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/50 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Realizado</p>
                    <p className={`text-xl font-bold leading-none ${weekTotal >= weekMeta ? "text-emerald-600" : "text-primary"}`}>
                      {formatBRLShort(weekTotal)}
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/50 col-span-2 sm:col-span-1 flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Diferença</p>
                    <p className={`text-xl font-bold leading-none ${weekTotal - weekMeta >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {weekTotal - weekMeta > 0 ? "+" : ""}{formatBRLShort(weekTotal - weekMeta)}
                    </p>
                  </div>
                </div>

                <Progress value={weekPct} className="h-2 mb-5" />

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {week.days.map((d) => {
                    const key = d.toISOString().slice(0, 10);
                    const dayValue = salesByDate[key] || 0;
                    const isPast = d <= todayUtc;
                    return (
                      <div
                        key={key}
                        className={`rounded-lg p-2.5 text-center transition-colors ${
                          isPast && dayValue > 0
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50"
                            : isPast
                            ? "bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/50"
                            : "bg-muted/30 border border-border/30"
                        }`}
                      >
                        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{DAY_NAMES[d.getUTCDay()]}</p>
                        <p className="text-[10px] text-muted-foreground/60 mb-1.5">{d.getUTCDate()}/{d.getUTCMonth() + 1}</p>
                        <p className={`font-bold text-sm leading-none ${dayValue > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"}`}>
                          {dayValue > 0 ? formatBRLShort(dayValue) : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
