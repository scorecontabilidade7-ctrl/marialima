import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Target, AlertTriangle,
} from "lucide-react";
import { useCurrentMonthGoals } from "@/hooks/useMonthlyGoals";
import { useVendedoresConfig } from "@/hooks/useVendedoresConfig";
import { isSellerMatch } from "@/hooks/usePAAnalysis";
import { type RankingItem, type TimelineItem } from "@/hooks/useSalesData";
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
  const { data: configs } = useVendedoresConfig();
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

  const sellerTotals = ranking.map(r => ({ name: r.vendedor, total: r.total, url_foto: r.url_foto }));

  const totalRealized = sellerTotals.reduce((s, v) => s + v.total, 0);
  const sellerCount = Math.max(sellerTotals.length, 1);

  const sellerWeights = useMemo(() => {
    return sellerTotals.map((s) => {
      const cfg = configs?.find((c) => isSellerMatch(c.nome_vendedor, s.name));
      const peso = cfg?.peso_meta !== undefined && cfg?.peso_meta !== null ? Number(cfg.peso_meta) : 1;
      return { name: s.name, peso };
    });
  }, [sellerTotals, configs]);

  const totalWeight = useMemo(() => {
    return sellerWeights.reduce((sum, item) => sum + item.peso, 0);
  }, [sellerWeights]);

  const getSellerMetas = (sellerName: string) => {
    const sw = sellerWeights.find((w) => w.name === sellerName);
    const peso = sw ? sw.peso : 1;
    if (peso <= 0) {
      return {
        peso: 0,
        minima: 0,
        top1: 0,
        top2: 0,
        master: 0,
      };
    }
    const ratio = totalWeight > 0 ? peso / totalWeight : 1 / sellerCount;
    return {
      peso,
      minima: METAS_LOJA.minima * ratio,
      top1: METAS_LOJA.top1 * ratio,
      top2: METAS_LOJA.top2 * ratio,
      master: METAS_LOJA.master * ratio,
    };
  };

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

  const activeMetaMensal = METAS_LOJA[selectedMeta];

  const weekPercents = useMemo(
    () => (distributionMode === "week" ? parsePercentArray(distributionPercentages, weeks.length) : null),
    [distributionMode, distributionPercentages, weeks.length],
  );

  const weekdayPercents = useMemo(
    () => (distributionMode === "day" ? parsePercentArray(distributionPercentages, 6) : null),
    [distributionMode, distributionPercentages],
  );

  const dayTargets = useMemo(
    () => (weekdayPercents ? buildDayTargetsFromWeekdayPercents(weeks as WeekSpec[], activeMetaMensal, weekdayPercents) : null),
    [weeks, activeMetaMensal, weekdayPercents],
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

  const [useAdjustedMetaPerWeek, setUseAdjustedMetaPerWeek] = useState<Record<number, boolean>>({});

  const enrichedWeeks = useMemo(() => {
    let accumulatedDeficit = 0;
    
    return weeks.map((week, weekIndex) => {
      const weekTotal = week.days.reduce((sum, d) => {
        const key = d.toISOString().slice(0, 10);
        return sum + (salesByDate[key] || 0);
      }, 0);

      const baseWeekMeta = weekPercents
        ? activeMetaMensal * (weekPercents[weekIndex] / 100)
        : weekdayPercents
        ? week.days.reduce((sum, d) => {
            const dayOfWeek = d.getUTCDay();
            if (dayOfWeek === 0) return sum;
            const target = dayTargets?.[d.toISOString().slice(0, 10)];
            return sum + (target ?? (activeMetaMensal * (weekdayPercents[dayOfWeek - 1] / 100)));
          }, 0)
        : (activeMetaMensal / DIAS_UTEIS_MES) * week.days.filter((d) => d.getUTCDay() !== 0).length;

      const carriedDeficit = accumulatedDeficit;
      const useAdjusted = !!useAdjustedMetaPerWeek[weekIndex];
      const activeMeta = useAdjusted ? baseWeekMeta + carriedDeficit : baseWeekMeta;
      const activePct = activeMeta > 0 ? Math.min((weekTotal / activeMeta) * 100, 100) : 0;

      const isWeekEnded = week.days.every((d) => d.getTime() < todayUtc.getTime());

      if (isWeekEnded) {
        accumulatedDeficit = Math.max(0, activeMeta - weekTotal);
      }

      return {
        ...week,
        weekIndex,
        weekTotal,
        baseWeekMeta,
        carriedDeficit,
        activeMeta,
        useAdjusted,
        activePct,
        isWeekEnded,
      };
    });
  }, [weeks, salesByDate, activeMetaMensal, DIAS_UTEIS_MES, todayUtc, weekPercents, weekdayPercents, dayTargets, useAdjustedMetaPerWeek]);

  return (
    <div className="space-y-6">
      {/* ── Cards de Meta da Loja ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {META_OPTIONS.map((opt) => {
          const isSelected = selectedMeta === opt.key;
          const metaValue = METAS_LOJA[opt.key];
          const pct = metaValue > 0 ? Math.min((totalRealized / metaValue) * 100, 100) : 0;
          const diff = totalRealized - metaValue;
          const isHit = diff >= 0;

          return (
            <Card
              key={opt.key}
              onClick={() => onMetaChange(opt.key)}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-primary shadow-md bg-card ring-1 ring-primary"
                  : "border-border/60 hover:border-border hover:shadow-sm bg-card/60"
              }`}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {opt.label}
                </CardTitle>
                <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Target className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold">{formatBRL(metaValue)}</div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Realizado: {formatBRL(totalRealized)}</span>
                    <span className={`font-semibold ${isHit ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <Progress value={pct} className="h-2" />

                <div className="text-xs flex items-center justify-between pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Diferença</span>
                  <span className={`font-semibold ${isHit ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {isHit ? "+" : ""}{formatBRL(diff)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vendas/Mês Diferença Table */}
      <Card className="hidden md:block border border-border/60">
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
                  const sMetas = getSellerMetas(seller.name);
                  const isZeroWeight = sMetas.peso <= 0;
                  const diffs = {
                    minima: seller.total - sMetas.minima,
                    top1: seller.total - sMetas.top1,
                    top2: seller.total - sMetas.top2,
                    master: seller.total - sMetas.master,
                  };
                  const config = configs?.find((c) => isSellerMatch(c.nome_vendedor, seller.name));
                  const photo = config?.url_foto;
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{seller.name}</span>
                            {sMetas.peso !== 1 && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isZeroWeight ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                                Peso {sMetas.peso}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right px-4 py-2.5 font-semibold">{formatBRL(seller.total)}</td>
                      {(["minima", "top1", "top2", "master"] as const).map((key) => {
                        if (isZeroWeight) {
                          return (
                            <td key={key} className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                              Isento (Peso 0)
                            </td>
                          );
                        }
                        const isHit = diffs[key] >= 0;
                        return (
                          <td
                            key={key}
                            className={`text-right px-4 py-2.5 font-semibold ${isHit ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {isHit ? "+" : ""}
                            {formatBRL(diffs[key])}
                          </td>
                        );
                      })}
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
      <Card className="hidden md:block border border-border/60">
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
                  const sMetas = getSellerMetas(seller.name);
                  const isZeroWeight = sMetas.peso <= 0;
                  const config = configs?.find((c) => isSellerMatch(c.nome_vendedor, seller.name));
                  const photo = config?.url_foto;
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{seller.name}</span>
                          {sMetas.peso !== 1 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isZeroWeight ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                              Peso {sMetas.peso}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {(["minima", "top1", "top2", "master"] as const).map((key) => {
                      if (isZeroWeight) {
                        return (
                          <td key={key} className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">
                            ISENTO
                          </td>
                        );
                      }
                      const reached = seller.total >= sMetas[key];
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

      {/* Mobile Unified Seller Cards */}
      <div className="block md:grid md:grid-cols-2 gap-4 md:hidden space-y-4 md:space-y-0">
        {sellerTotals.map((seller, i) => {
          const sMetas = getSellerMetas(seller.name);
          const isZeroWeight = sMetas.peso <= 0;
          const diffs = {
            minima: seller.total - sMetas.minima,
            top1: seller.total - sMetas.top1,
            top2: seller.total - sMetas.top2,
            master: seller.total - sMetas.master,
          };
          const config = configs?.find((c) => isSellerMatch(c.nome_vendedor, seller.name));
          const photo = config?.url_foto;
          const metasKeys = [
            { key: "minima" as const, label: "Meta Mínima" },
            { key: "top1" as const, label: "Top 1" },
            { key: "top2" as const, label: "Top 2" },
            { key: "master" as const, label: "Master" }
          ];

          return (
            <Card 
              key={seller.name} 
              className="border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-card"
              onClick={() => navigate(`/vendedor/${encodeURIComponent(seller.name)}${queryStr}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden`}>
                      {photo ? (
                        <img src={photo} alt={seller.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(seller.name)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-base text-foreground leading-none">{seller.name}</p>
                        {sMetas.peso !== 1 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${isZeroWeight ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                            Peso {sMetas.peso}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5 uppercase tracking-wide font-medium">
                        Realizado: <span className="font-bold text-primary">{formatBRL(seller.total)}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {metasKeys.map(({ key, label }) => {
                    if (isZeroWeight) {
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{label}</span>
                          <span className="font-medium text-muted-foreground text-[10px] uppercase">
                            Isento
                          </span>
                        </div>
                      );
                    }
                    const diff = diffs[key];
                    const reached = diff >= 0;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{label}</span>
                        {reached ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded text-[10px] uppercase border border-emerald-200 dark:border-emerald-800/50">
                            ✅ Atingido
                          </span>
                        ) : (
                          <span className="font-semibold text-red-500 bg-red-50/50 dark:bg-red-950/20 px-2 py-0.5 rounded text-[10px] uppercase border border-red-100 dark:border-red-900/30">
                            Falta {formatBRLShort(Math.abs(diff))}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sellerTotals.length === 0 && (
          <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma venda no mês atual</p>
        )}
      </div>

      {/* Weekly tracking */}
      <Card className="border border-border/60">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-sm font-semibold">
              Acompanhamento Semanal da Loja
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Meta de referência: <span className="font-semibold text-primary">{META_OPTIONS.find(m => m.key === selectedMeta)?.label}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrichedWeeks.map((week) => {
            const {
              label, days, weekIndex, weekTotal, baseWeekMeta, carriedDeficit,
              activeMeta, useAdjusted, activePct, isWeekEnded
            } = week;

            const toggleAdjusted = (checked: boolean) => {
              setUseAdjustedMetaPerWeek((prev) => ({ ...prev, [weekIndex]: checked }));
            };

            const hasCarriedDeficit = carriedDeficit > 0;

            return (
              <div key={label} className="border border-border/50 bg-card rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    {label}
                  </h4>
                  {weekTotal >= activeMeta && activeMeta > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300/40">
                      🎯 Meta Superada! ({activePct.toFixed(0)}%)
                    </span>
                  ) : isWeekEnded ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs font-bold border border-red-300/40">
                      ❌ Faltou <span className="md:hidden">{formatBRLShort(activeMeta - weekTotal)}</span><span className="hidden md:inline">{formatBRL(activeMeta - weekTotal)}</span> ({activePct.toFixed(0)}%)
                    </span>
                  ) : weekTotal > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300/40">
                      🏃 Faltam <span className="md:hidden">{formatBRLShort(activeMeta - weekTotal)}</span><span className="hidden md:inline">{formatBRL(activeMeta - weekTotal)}</span> ({activePct.toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border/40">
                      😴 Sem vendas ainda
                    </span>
                  )}
                </div>

                {hasCarriedDeficit && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        Esta semana inclui <strong className="font-bold">{formatBRL(carriedDeficit)}</strong> acumulados das semanas anteriores.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`switch-${weekIndex}`} className="text-xs font-semibold cursor-pointer select-none">
                        Meta Ajustada
                      </label>
                      <Switch 
                        id={`switch-${weekIndex}`}
                        checked={useAdjusted} 
                        onCheckedChange={toggleAdjusted} 
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-5">
                  <div className="bg-muted/40 rounded-lg p-2.5 sm:p-3 border border-border/50 flex flex-col justify-center min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Meta Semanal</p>
                    <p className="text-base sm:text-xl font-bold text-foreground leading-none truncate">
                      <span className="md:hidden">{formatBRLShort(activeMeta)}</span>
                      <span className="hidden md:inline">{formatBRL(activeMeta)}</span>
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2.5 sm:p-3 border border-border/50 flex flex-col justify-center min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Realizado</p>
                    <p className={`text-base sm:text-xl font-bold leading-none truncate ${weekTotal >= activeMeta ? "text-emerald-600 dark:text-emerald-400" : isWeekEnded ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
                      <span className="md:hidden">{formatBRLShort(weekTotal)}</span>
                      <span className="hidden md:inline">{formatBRL(weekTotal)}</span>
                    </p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2.5 sm:p-3 border border-border/50 col-span-2 sm:col-span-1 flex flex-col justify-center min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Diferença</p>
                    <p className={`text-base sm:text-xl font-bold leading-none truncate ${weekTotal - activeMeta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {weekTotal - activeMeta > 0 ? "+" : ""}
                      <span className="md:hidden">{formatBRLShort(weekTotal - activeMeta)}</span>
                      <span className="hidden md:inline">{formatBRL(weekTotal - activeMeta)}</span>
                    </p>
                  </div>
                </div>

                <Progress value={activePct} className="h-2 mb-5" />

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {days.map((d) => {
                    const key = d.toISOString().slice(0, 10);
                    const dayValue = salesByDate[key] || 0;
                    const isPast = d <= todayUtc;
                    
                    // Distribute activeMeta among the days of the week proportionally
                    // If we use dayTargets, we scale it. Otherwise we divide evenly.
                    const dayMeta = (() => {
                      if (distributionMode === "day" && dayTargets) {
                        const originalDayTarget = dayTargets[key] || 0;
                        const factor = baseWeekMeta > 0 ? (activeMeta / baseWeekMeta) : 1;
                        return originalDayTarget * factor;
                      }
                      return days.length > 0 ? activeMeta / days.length : 0;
                    })();

                    const isDayHit = isPast && dayValue >= dayMeta && dayMeta > 0;
                    const isDayMiss = isPast && !isDayHit;

                    return (
                      <div
                        key={key}
                        className={`rounded-lg p-2.5 text-center transition-colors ${
                          isDayHit
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50"
                            : isDayMiss
                            ? "bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/50"
                            : "bg-muted/30 border border-border/30"
                        }`}
                      >
                        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{DAY_NAMES[d.getUTCDay()]}</p>
                        <p className="text-[10px] text-muted-foreground/60 mb-1.5">{d.getUTCDate()}/{d.getUTCMonth() + 1}</p>
                        <div className="mb-1 text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                          Meta: {formatBRLShort(dayMeta)}
                        </div>
                        <p className={`font-bold text-sm leading-none ${
                          isDayHit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isDayMiss
                            ? dayValue > 0 ? "text-red-600 dark:text-red-400" : "text-red-500/50 dark:text-red-400/50"
                            : "text-muted-foreground/40"
                        }`}>
                          {dayValue > 0 ? (
                            <>
                              <span className="md:hidden">{formatBRLShort(dayValue)}</span>
                              <span className="hidden md:inline">{formatBRL(dayValue)}</span>
                            </>
                          ) : "—"}
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
