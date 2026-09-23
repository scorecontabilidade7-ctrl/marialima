import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useRawSalesData, useSalesData } from "@/hooks/useSalesData";
import { useCurrentMonthGoals } from "@/hooks/useMonthlyGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, TrendingUp, ShoppingBag, Users, Award, DollarSign,
  RefreshCw, ChevronLeft, ChevronRight, Target, AlertTriangle, Layers
} from "lucide-react";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";
import { calculateSingleDynamicCommission } from "@/hooks/useDynamicCommissions";
import { usePAAnalysis, isSellerMatch, type PAFilters } from "@/hooks/usePAAnalysis";
import {
  AreaChart, Area, BarChart, Bar, LabelList, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { useVendedoresConfig } from "@/hooks/useVendedoresConfig";
import { useUserAccess } from "@/hooks/useUserAccess";

const TEAL = "hsl(188, 55%, 40%)";
const TEAL_LIGHT = "hsl(188, 48%, 88%)";
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type MetaKey = "minima" | "top1" | "top2" | "master";
type DistributionMode = "uniform" | "day" | "week";
type WeekSpec = { label: string; days: Date[] };

export const META_OPTIONS: { key: MetaKey; label: string }[] = [
  { key: "minima", label: "Meta Mínima" },
  { key: "top1",   label: "Top 1" },
  { key: "top2",   label: "Top 2" },
  { key: "master", label: "Master" },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toFixed(0)}`;
}
function fmtPA(v: number) {
  return (v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatMobileLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

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

export function getDailyGoalFraction(dateStr: string, goalData: any) {
  if (!goalData) return 0;
  const mode = goalData.distribution_mode || "uniform";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay(); // 0 = Domingo
  
  if (dow === 0) return 0; // Domingos não têm meta

  if (mode === "day") {
    const rawPcts = goalData.distribution_day || goalData.distribution_percentages;
    const pcts = Array.isArray(rawPcts) ? rawPcts.map(Number) : [];
    const pct = pcts[dow - 1] || 0;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let count = 0;
    for (let i = 1; i <= lastDay; i++) {
      if (new Date(Date.UTC(y, m - 1, i)).getUTCDay() === dow) count++;
    }
    return count > 0 ? (pct / 100) / count : 0;
  }

  const diasUteis = goalData.dias_uteis || 24;
  return 1 / diasUteis;
}

export default function SellerProfile() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = (searchParams.get("store") as "sobral" | "itapipoca") || "sobral";
  const sellerName = decodeURIComponent(name || "");
  const { data, isLoading } = useRawSalesData(store, sellerName);
  const { data: configs } = useVendedoresConfig();
  const { isSeller, profileData } = useUserAccess();

  useEffect(() => {
    if (isSeller && profileData?.nome_vendedor) {
      if (sellerName !== profileData.nome_vendedor) {
        navigate(`/vendedor/${encodeURIComponent(profileData.nome_vendedor)}?store=${profileData.loja || 'sobral'}`, { replace: true });
      }
    }
  }, [isSeller, profileData, sellerName, navigate]);

  const photo = configs?.find((c) => c.nome_vendedor === sellerName)?.url_foto;
  const firstName = sellerName.split(" ")[0];

  // ── Filter data for this seller ───────────────────────────────────────────
  const myVendas = useMemo(
    () => (data?.vendedores || []).filter((v) => v.vendedor === sellerName),
    [data, sellerName]
  );

  const myVendaNums = useMemo(
    () => new Set(myVendas.map((v) => v.numero_venda)),
    [myVendas]
  );

  const myDetalhada = useMemo(
    () => (data?.detalhada || []).filter((d) => myVendaNums.has(d.venda)),
    [data, myVendaNums]
  );

  // ── Current month & day selection ─────────────────────────────────────────
  const now = new Date();
  const { year: realYear, month: realMonth } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  
  const [selectedMonth, setSelectedMonth] = useState({
    year: searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : realYear,
    month: searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : realMonth
  });

  const [selectedDay, setSelectedDay] = useState<string>("all");

  const currentYear = selectedMonth.year;
  const currentMonth = selectedMonth.month;
  const targetYearMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const selectedMonthLabel = `${MONTH_NAMES[currentMonth - 1]} de ${currentYear}`;
  const isCurrentMonth = currentYear === realYear && currentMonth === realMonth;

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dayOptions = useMemo(() => [
    { value: "all", label: "Mês todo" },
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      value: String(i + 1),
      label: `Dia ${i + 1}`,
    })),
  ], [daysInMonth]);

  const isDayView = selectedDay !== "all";
  const targetDayDate = isDayView
    ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : undefined;

  const goToPrevMonth = () => {
    setSelectedDay("all");
    setSelectedMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };
  const goToNextMonth = () => {
    setSelectedDay("all");
    setSelectedMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const { data: goalData } = useCurrentMonthGoals(store, targetYearMonth);
  
  const initialCommissionStr = sessionStorage.getItem("dashboardCommissionMode");
  const commissionMode = (initialCommissionStr as "fixa" | "dinamica") || "dinamica";

  const dashboardFilters = useMemo(
    () => ({
      year: currentYear,
      month: currentMonth,
      vendedor: "all",
      departamento: "all",
    }),
    [currentYear, currentMonth]
  );
  const { data: dashboardData } = useSalesData(store, dashboardFilters);

  const paFilters: PAFilters = useMemo(
    () => ({
      year: currentYear,
      month: currentMonth,
    }),
    [currentYear, currentMonth]
  );
  const { data: paData } = usePAAnalysis(store, paFilters);

  const monthVendas = useMemo(
    () =>
      myVendas.filter((v) => {
        if (!v.data_venda) return false;
        const [y, m] = v.data_venda.split("-");
        return Number(y) === currentYear && Number(m) === currentMonth;
      }),
    [myVendas, currentMonth, currentYear]
  );

  const totalMes = monthVendas.reduce((s, v) => s + v.valor_total, 0);
  const totalGeral = myVendas.reduce((s, v) => s + v.valor_total, 0);
  
  const monthTicketMedio = monthVendas.length > 0 ? totalMes / monthVendas.length : 0;
  const ticketMedio = myVendas.length > 0 ? totalGeral / myVendas.length : 0;
  const numPedidos = myVendas.length;

  // ── Filtered vendas for selected day/month ────────────────────────────────
  const filteredVendas = useMemo(() => {
    return monthVendas.filter((v) => {
      if (!v.data_venda) return false;
      if (selectedDay === "all") return true;
      const [, , d] = v.data_venda.split("-");
      return Number(d) === Number(selectedDay);
    });
  }, [monthVendas, selectedDay]);

  const totalPeriodo = filteredVendas.reduce((s, v) => s + v.valor_total, 0);
  const numPedidosPeriodo = filteredVendas.length;
  const ticketMedioPeriodo = numPedidosPeriodo > 0 ? totalPeriodo / numPedidosPeriodo : 0;

  const sellerPAItem = useMemo(() => {
    if (!paData?.ranking) return null;
    return paData.ranking.find((r) => isSellerMatch(r.vendedor, sellerName));
  }, [paData?.ranking, sellerName]);

  const sellerPA = sellerPAItem?.pa ?? 0;
  const sellerItens = sellerPAItem?.total_itens ?? 0;
  const storePA = paData?.kpis?.pa_loja ?? 0;
  const paDiff = sellerPAItem?.diff_vs_loja ?? (sellerPA > 0 && storePA > 0 ? sellerPA - storePA : 0);

  // ── All sellers rank ──────────────────────────────────────────────────────
  const validSellersRanking = useMemo(() => {
    return (dashboardData?.ranking || []).filter(
      (r) => r.vendedor && !["LOJA", "GERAL", "ADMIN"].includes(r.vendedor.trim().toUpperCase())
    );
  }, [dashboardData?.ranking]);

  const rank = useMemo(() => {
    if (validSellersRanking.length === 0) return 0;
    return validSellersRanking.findIndex((r) => isSellerMatch(r.vendedor, sellerName)) + 1;
  }, [validSellersRanking, sellerName]);

  const sellerCount = Math.max(validSellersRanking.length, 1);
  const sellerConfig = configs?.find((c) => isSellerMatch(c.nome_vendedor, sellerName));
  const sellerWeight = sellerConfig?.peso_meta !== undefined && sellerConfig?.peso_meta !== null ? Number(sellerConfig.peso_meta) : 1;

  const totalWeight = useMemo(() => {
    if (validSellersRanking.length === 0) return 1;
    return validSellersRanking.reduce((acc, r) => {
      const cfg = configs?.find((c) => isSellerMatch(c.nome_vendedor, r.vendedor));
      const w = cfg?.peso_meta !== undefined && cfg?.peso_meta !== null ? Number(cfg.peso_meta) : 1;
      return acc + w;
    }, 0) || 1;
  }, [validSellersRanking, configs]);

  const sellerRatio = totalWeight > 0 ? sellerWeight / totalWeight : (sellerCount > 0 ? 1 / sellerCount : 1);

  const comissaoFixaMes = monthVendas.reduce((s, v) => s + v.comissao_vendedor, 0);
  const comissaoDinamicaMes = useMemo(
    () => calculateSingleDynamicCommission(totalMes, sellerCount, goalData, sellerRatio, sellerWeight),
    [totalMes, sellerCount, goalData, sellerRatio, sellerWeight]
  );

  const comissaoFixaPeriodo = filteredVendas.reduce((s, v) => s + v.comissao_vendedor, 0);
  const comissaoDinamicaPeriodo = useMemo(() => {
    if (selectedDay === "all") {
      return comissaoDinamicaMes;
    }
    if (totalMes > 0 && comissaoDinamicaMes > 0) {
      const dynamicRate = comissaoDinamicaMes / totalMes;
      return totalPeriodo * dynamicRate;
    }
    return calculateSingleDynamicCommission(totalPeriodo, sellerCount, goalData, sellerRatio, sellerWeight);
  }, [selectedDay, comissaoDinamicaMes, totalMes, totalPeriodo, sellerCount, goalData, sellerRatio, sellerWeight]);

  const displayComissao = 0;

  // ── Monthly history (last 12 months) ─────────────────────────────────────
  const monthlyHistory = useMemo(() => {
    const map: Record<string, number> = {};
    myVendas.forEach((v) => {
      if (!v.data_venda) return;
      const [y, m] = v.data_venda.split("-");
      const key = `${y}-${m.padStart(2, "0")}`;
      map[key] = (map[key] || 0) + v.valor_total;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([ym, total]) => {
        const [, m] = ym.split("-");
        return { label: MONTH_NAMES[parseInt(m) - 1], total };
      });
  }, [myVendas]);

  // ── Top departments & Top clients (filtered) ─────────────────────────────
  const filteredVendaNums = useMemo(
    () => new Set(filteredVendas.map((v) => v.numero_venda)),
    [filteredVendas]
  );

  const filteredDetalhada = useMemo(
    () => (data?.detalhada || []).filter((d) => filteredVendaNums.has(d.venda)),
    [data, filteredVendaNums]
  );

  const sellerItensPeriodo = useMemo(() => {
    return filteredDetalhada.reduce((acc, d) => acc + (d.qtd || 1), 0);
  }, [filteredDetalhada]);

  const sellerPAPeriodo = useMemo(() => {
    if (numPedidosPeriodo === 0) return 0;
    return sellerItensPeriodo / numPedidosPeriodo;
  }, [sellerItensPeriodo, numPedidosPeriodo]);

  const topDepts = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDetalhada.forEach((d) => {
      if (d.departamento) map[d.departamento] = (map[d.departamento] || 0) + d.subtotal;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, total]) => ({ name, total }));
  }, [filteredDetalhada]);

  const topClients = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredVendas.forEach((v) => {
      const c = v.cliente || "Desconhecido";
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += v.valor_total;
      map[c].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, d]) => ({ name, ...d }));
  }, [filteredVendas]);

  // ── Tipo de venda ─────────────────────────────────────────────────────────
  const tiposVenda = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVendas.forEach((v) => {
      const t = v.tipo_venda || "Outros";
      map[t] = (map[t] || 0) + v.valor_total;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, total]) => ({ tipo, total }));
  }, [filteredVendas]);

  // ── Goal performance (Mês todo vs Dia específico) ────────────────────────
  const metas = goalData
    ? {
        minima: sellerWeight === 0 ? 0 : goalData.meta_minima * sellerRatio,
        top1: sellerWeight === 0 ? 0 : goalData.meta_top1 * sellerRatio,
        top2: sellerWeight === 0 ? 0 : goalData.meta_top2 * sellerRatio,
        master: sellerWeight === 0 ? 0 : goalData.meta_master * sellerRatio,
      }
    : { minima: 18000, top1: 22000, top2: 26000, master: 30000 };

  const dailyFraction = isDayView && targetDayDate ? getDailyGoalFraction(targetDayDate, goalData) : 1;
  const isSundaySelection = isDayView && targetDayDate && new Date(targetDayDate + "T12:00:00Z").getUTCDay() === 0;

  const goalLevels = [
    { label: "Meta Mínima", value: metas.minima * dailyFraction, color: "hsl(215 52% 52%)", perc: 0.010 },
    { label: "Top 1",       value: metas.top1 * dailyFraction,   color: "hsl(188 55% 40%)", perc: 0.013 },
    { label: "Top 2",       value: metas.top2 * dailyFraction,   color: "hsl(172 48% 42%)", perc: 0.015 },
    { label: "Master",      value: metas.master * dailyFraction, color: "hsl(38 92% 50%)",  perc: 0.020 },
  ];

  const realizedPerformance = isDayView ? totalPeriodo : totalMes;

  // ── Weekly individual goal tracking ──────────────────────────────────────
  const [selectedMeta, setSelectedMeta] = useState<MetaKey>("minima");
  const [useAdjustedMetaPerWeek, setUseAdjustedMetaPerWeek] = useState<Record<number, boolean>>({});

  const { day: todayDay } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  const todayUtc = new Date(Date.UTC(realYear, realMonth - 1, todayDay, 23, 59, 59, 999));
  const DIAS_UTEIS_MES = goalData?.dias_uteis ?? 24;

  const sellerSalesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    monthVendas.forEach((v) => {
      if (!v.data_venda) return;
      map[v.data_venda] = (map[v.data_venda] || 0) + v.valor_total;
    });
    return map;
  }, [monthVendas]);

  const weeks = useMemo(() => getWeeksOfMonth(currentYear, currentMonth - 1), [currentYear, currentMonth]);

  const distributionMode = ((goalData as any)?.distribution_mode as DistributionMode | undefined) ?? "uniform";
  const distributionPercentages = (goalData as any)?.distribution_percentages as unknown;

  const selectedSellerMonthlyGoal = metas[selectedMeta] ?? 0;

  const weekPercents = useMemo(
    () => (distributionMode === "week" ? parsePercentArray(distributionPercentages, weeks.length) : null),
    [distributionMode, distributionPercentages, weeks.length],
  );

  const weekdayPercents = useMemo(
    () => (distributionMode === "day" ? parsePercentArray(distributionPercentages, 6) : null),
    [distributionMode, distributionPercentages],
  );

  const dayTargets = useMemo(
    () => (weekdayPercents ? buildDayTargetsFromWeekdayPercents(weeks as WeekSpec[], selectedSellerMonthlyGoal, weekdayPercents) : null),
    [weeks, selectedSellerMonthlyGoal, weekdayPercents],
  );

  const activeWeeklyMetaDiaria = selectedSellerMonthlyGoal > 0 && DIAS_UTEIS_MES > 0 ? selectedSellerMonthlyGoal / DIAS_UTEIS_MES : 0;

  const enrichedWeeks = useMemo(() => {
    let accumulatedDeficit = 0;

    return weeks.map((week, weekIndex) => {
      const weekTotal = week.days.reduce((sum, d) => {
        const key = d.toISOString().slice(0, 10);
        return sum + (sellerSalesByDate[key] || 0);
      }, 0);

      const baseWeekMeta = sellerWeight <= 0
        ? 0
        : weekPercents
        ? selectedSellerMonthlyGoal * (weekPercents[weekIndex] / 100)
        : weekdayPercents
        ? week.days.reduce((sum, d) => {
            const dayOfWeek = d.getUTCDay();
            if (dayOfWeek === 0) return sum;
            const target = dayTargets?.[d.toISOString().slice(0, 10)];
            return sum + (target ?? (selectedSellerMonthlyGoal * (weekdayPercents[dayOfWeek - 1] / 100)));
          }, 0)
        : activeWeeklyMetaDiaria * week.days.length;

      const useAdjusted = useAdjustedMetaPerWeek[weekIndex] ?? true;
      const carriedDeficit = accumulatedDeficit;
      const adjustedMeta = baseWeekMeta + carriedDeficit;

      const activeMeta = useAdjusted ? adjustedMeta : baseWeekMeta;
      const activePct = activeMeta > 0 ? Math.min((weekTotal / activeMeta) * 100, 100) : 0;

      const lastDayOfWeek = week.days[week.days.length - 1];
      const isWeekEnded = lastDayOfWeek ? lastDayOfWeek.getTime() <= todayUtc.getTime() : false;

      if (isWeekEnded) {
        accumulatedDeficit = weekTotal < activeMeta ? (activeMeta - weekTotal) : 0;
      } else {
        accumulatedDeficit = 0;
      }

      return {
        ...week,
        weekIndex,
        weekTotal,
        baseWeekMeta,
        carriedDeficit,
        adjustedMeta,
        activeMeta,
        useAdjusted,
        activePct,
        isWeekEnded,
      };
    });
  }, [weeks, sellerSalesByDate, selectedSellerMonthlyGoal, sellerWeight, activeWeeklyMetaDiaria, todayUtc, weekPercents, weekdayPercents, dayTargets, useAdjustedMetaPerWeek]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 animate-in fade-in duration-500">
          <div className="p-4 rounded-full bg-primary/10">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="space-y-1.5 text-center">
            <h3 className="text-lg font-bold text-foreground tracking-tight">Carregando perfil...</h3>
            <p className="text-sm text-muted-foreground">Buscando histórico e desempenho de vendas</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-card px-6 py-2 flex items-center justify-between sticky top-0 z-10 gap-2">
        {!isSeller ? (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        ) : (
          <div className="w-8 sm:w-16 shrink-0" />
        )}
        
        <div className="flex flex-1 justify-center items-center gap-2">
          <div className="flex items-center gap-1 h-9 border border-border rounded-md bg-secondary px-1">
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-accent transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium w-24 sm:w-32 text-center capitalize tabular-nums select-none truncate">
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

          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[120px] sm:w-[130px] h-9 bg-secondary border-border text-sm font-medium focus:ring-1 focus:ring-primary shrink-0">
              <SelectValue placeholder="Mês todo" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-popover text-popover-foreground border-border z-50">
              {dayOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <img src="/logo.png" alt="Maria Lima" className="h-8 w-auto object-contain shrink-0" />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Profile card ──────────────────────────────────────────────── */}
        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${TEAL}, hsl(172,48%,42%))` }} />
          <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-center">
            {/* Avatar */}
            <div
              className="w-36 h-36 rounded-full shrink-0 overflow-hidden flex items-center justify-center text-4xl font-bold"
              style={{ border: `4px solid ${TEAL}`, backgroundColor: TEAL_LIGHT, color: TEAL }}
            >
              {photo
                ? <img src={photo} alt={firstName} className="w-full h-full object-cover" />
                : firstName.slice(0, 2).toUpperCase()
              }
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-foreground">{sellerName}</h1>
              {myVendas[0]?.supervisor && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Supervisor: <span className="font-medium text-foreground">{myVendas[0].supervisor}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {rank > 0 && (
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: rank === 1 ? TEAL : TEAL_LIGHT, color: rank === 1 ? "#fff" : TEAL }}
                  >
                    #{rank} Ranking Geral
                  </span>
                )}
                {totalMes >= metas.master && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Master</span>}
                {totalMes >= metas.top2 && totalMes < metas.master && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Top 2</span>}
                {totalMes >= metas.top1 && totalMes < metas.top2 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Top 1</span>}
                {totalMes >= metas.minima && totalMes < metas.top1 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Meta Mínima</span>}
              </div>
            </div>

            {/* Period highlight */}
            <div className="text-center sm:text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-md mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {isDayView ? `Dia ${selectedDay} de ${selectedMonthLabel}` : selectedMonthLabel}
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold leading-none truncate" style={{ color: TEAL }}>{fmt(totalPeriodo)}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{numPedidosPeriodo} pedido{numPedidosPeriodo !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { 
              label: isDayView ? "Total no Dia" : "Total no Mês",  
              value: fmt(totalPeriodo), 
              icon: DollarSign,  
              sub: `${numPedidosPeriodo} pedido${numPedidosPeriodo !== 1 ? "s" : ""}` 
            },
            { 
              label: isDayView ? "Comissão no Dia" : "Comissão no Mês",   
              value: fmt(displayComissao), 
              icon: Award,       
              sub: commissionMode === "dinamica" ? "dinâmica" : "fixa" 
            },
            { 
              label: "P.A Médio",     
              value: sellerPA > 0 ? fmtPA(sellerPA) : "0,00", 
              icon: Layers,  
              sub: storePA > 0 
                ? `Média loja: ${fmtPA(storePA)}` 
                : "peças / atend." 
            },
            { 
              label: "Ticket Médio",     
              value: fmt(ticketMedio), 
              icon: TrendingUp,  
              sub: "média histórica por pedido" 
            },
            { 
              label: isDayView ? "Pedidos no Dia" : "Pedidos no Mês",   
              value: String(numPedidosPeriodo), 
              icon: ShoppingBag, 
              sub: isDayView ? `no dia ${selectedDay}` : `em ${selectedMonthLabel.toLowerCase()}` 
            },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-border bg-card shadow-sm overflow-hidden">
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                  <kpi.icon className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: TEAL }} />
                </div>
                <div className="min-w-0 w-full">
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-base sm:text-lg font-bold text-foreground truncate">{kpi.value}</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Row: Histórico + Metas ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Histórico mensal */}
          <Card className="lg:col-span-3 border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">
                <span className="hidden md:inline">Histórico de Vendas Mensais</span>
                <span className="md:hidden">Histórico (Últimos 6 Meses)</span>
              </CardTitle>
              {metas.minima > 0 && (
                <p className="text-[11px] text-muted-foreground md:hidden mt-0.5 font-medium">
                  Comparado à meta mínima de {fmt(metas.minima)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {monthlyHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados históricos</p>
              ) : (
                <>
                  {/* --- MOBILE LAYOUT (Last 6 months, Bar Chart, No Y Axis) --- */}
                  <div className="block md:hidden">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={monthlyHistory.slice(-6)} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: "500" }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "#fff", color: "#000", fontSize: 12, borderRadius: "6px" }} labelStyle={{ color: "#000", fontWeight: "bold" }} itemStyle={{ color: "#000" }} cursor={{ fill: "hsl(220,13%,95%)" }} />
                        {metas.minima > 0 && (
                          <ReferenceLine y={metas.minima} stroke="hsl(220,10%,60%)" strokeDasharray="3 3" />
                        )}
                        <Bar dataKey="total" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList
                            dataKey="total"
                            position="top"
                            content={(props: any) => {
                              const { x, y, width, value } = props;
                              const hit = value >= metas.minima;
                              const formatted = formatMobileLabel(value);
                              return (
                                <g transform={`translate(${x + width / 2},${y - 4})`}>
                                  <text x={0} y={-10} fontSize="12" textAnchor="middle">
                                    {hit ? "🎯" : "⚠️"}
                                  </text>
                                  <text x={0} y={2} fill="hsl(var(--foreground))" fontSize="10" textAnchor="middle" fontWeight="bold">
                                    {formatted}
                                  </text>
                                </g>
                              );
                            }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* --- DESKTOP LAYOUT (Full 12 months, Area Chart) --- */}
                  <div className="hidden md:block">
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={monthlyHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={TEAL} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "#fff", color: "#000", fontSize: 12 }} labelStyle={{ color: "#000", fontWeight: "bold" }} itemStyle={{ color: "#000" }} />
                        <Area type="monotone" dataKey="total" stroke={TEAL} strokeWidth={2} fill="url(#spGrad)" dot={{ r: 3, fill: TEAL }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance de Metas */}
          <Card className="lg:col-span-2 border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">
                Performance de Metas — {isDayView ? `Dia ${selectedDay} de ${selectedMonthLabel}` : selectedMonthLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sellerWeight <= 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Vendedor isento de metas (Peso 0).
                </div>
              ) : isSundaySelection ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Domingos não possuem meta estipulada.
                </div>
              ) : (
                goalLevels.map((g) => {
                  const pct = g.value > 0 ? Math.min((realizedPerformance / g.value) * 100, 100) : 0;
                  const reached = g.value > 0 && realizedPerformance >= g.value;
                  const diff = Math.max(0, g.value - realizedPerformance);

                  return (
                    <div key={g.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{g.label}</span>
                        <span className={reached ? "font-bold" : "text-muted-foreground"} style={reached ? { color: g.color } : {}}>
                          {reached ? "✓ Atingida" : `${pct.toFixed(0)}% — faltam ${fmt(diff)}`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: g.color }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        <p className="text-[10px] text-muted-foreground">
                          Comissão ({(g.perc * 100).toFixed(1).replace(".", ",")}%): <span className="font-medium">{fmt(g.value * g.perc)}</span>
                        </p>
                        <p className="text-[10.5px] text-muted-foreground text-right">{fmt(g.value)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Acompanhamento Semanal do Vendedor ─────────────────────────── */}
        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Metas da Semana — Acompanhamento Individual
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sellerWeight <= 0
                  ? "Este vendedor está configurado com Peso 0 (Isento de Metas)."
                  : `Meta individual calculada com base no peso (${sellerWeight}) e dias úteis do mês (${DIAS_UTEIS_MES} dias).`}
              </p>
            </div>

            {sellerWeight > 0 && (
              <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/40 shrink-0">
                {META_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedMeta(opt.key)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${
                      selectedMeta === opt.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {sellerWeight <= 0 ? (
              <div className="py-8 text-center bg-muted/20 rounded-xl border border-border/40">
                <p className="text-sm font-medium text-muted-foreground">Vendedor isento de metas no período.</p>
              </div>
            ) : (
              enrichedWeeks.map((week) => {
                const {
                  label, days, weekIndex, weekTotal, baseWeekMeta, carriedDeficit,
                  activeMeta, useAdjusted, activePct, isWeekEnded
                } = week;

                const toggleAdjusted = (checked: boolean) => {
                  setUseAdjustedMetaPerWeek((prev) => ({ ...prev, [weekIndex]: checked }));
                };

                const hasCarriedDeficit = carriedDeficit > 0;
                const diff = weekTotal - activeMeta;
                const isHit = diff >= 0;

                return (
                  <div key={label} className="border border-border/60 bg-muted/10 rounded-xl p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEAL }} />
                        <h4 className="text-base font-bold text-foreground">{label}</h4>
                        <span className="text-xs text-muted-foreground">
                          ({days[0]?.getUTCDate()}/{days[0]?.getUTCMonth() + 1} a {days[days.length - 1]?.getUTCDate()}/{days[days.length - 1]?.getUTCMonth() + 1})
                        </span>
                      </div>
                      
                      {weekTotal >= activeMeta && activeMeta > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300/40">
                          🎯 Meta Superada! ({activePct.toFixed(0)}%)
                        </span>
                      ) : isWeekEnded ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs font-bold border border-red-300/40">
                          ❌ Faltou <span className="md:hidden">{fmtShort(activeMeta - weekTotal)}</span><span className="hidden md:inline">{fmt(activeMeta - weekTotal)}</span> ({activePct.toFixed(0)}%)
                        </span>
                      ) : weekTotal > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300/40">
                          🏃 Faltam <span className="md:hidden">{fmtShort(activeMeta - weekTotal)}</span><span className="hidden md:inline">{fmt(activeMeta - weekTotal)}</span> ({activePct.toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border/40">
                          😴 Sem vendas na semana
                        </span>
                      )}
                    </div>

                    {hasCarriedDeficit && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            Esta semana inclui <strong className="font-bold">{fmt(carriedDeficit)}</strong> acumulados das semanas anteriores.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label htmlFor={`switch-seller-${weekIndex}`} className="text-xs font-semibold cursor-pointer select-none">
                            Meta Ajustada
                          </label>
                          <Switch 
                            id={`switch-seller-${weekIndex}`}
                            checked={useAdjusted} 
                            onCheckedChange={toggleAdjusted} 
                            className="data-[state=checked]:bg-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
                      <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border/60 flex flex-col justify-center min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Meta Semanal</p>
                        <p className="text-base sm:text-lg font-bold text-foreground leading-none truncate">
                          <span className="md:hidden">{fmtShort(activeMeta)}</span>
                          <span className="hidden md:inline">{fmt(activeMeta)}</span>
                        </p>
                      </div>
                      <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border/60 flex flex-col justify-center min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Realizado</p>
                        <p className={`text-base sm:text-lg font-bold leading-none truncate ${isHit ? "text-emerald-600 dark:text-emerald-400" : isWeekEnded ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
                          <span className="md:hidden">{fmtShort(weekTotal)}</span>
                          <span className="hidden md:inline">{fmt(weekTotal)}</span>
                        </p>
                      </div>
                      <div className="bg-card rounded-lg p-2.5 sm:p-3 border border-border/60 col-span-2 sm:col-span-1 flex flex-col justify-center min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 truncate">Diferença</p>
                        <p className={`text-base sm:text-lg font-bold leading-none truncate ${isHit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {diff > 0 ? "+" : ""}
                          <span className="md:hidden">{fmtShort(diff)}</span>
                          <span className="hidden md:inline">{fmt(diff)}</span>
                        </p>
                      </div>
                    </div>

                    <Progress value={activePct} className="h-2 mb-4" />

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {days.map((d) => {
                        const key = d.toISOString().slice(0, 10);
                        const dayValue = sellerSalesByDate[key] || 0;
                        const isPast = d <= todayUtc;
                        
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
                              Meta: {fmtShort(dayMeta)}
                            </div>
                            <p className={`font-bold text-xs sm:text-sm leading-none ${
                              isDayHit
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isDayMiss
                                ? dayValue > 0 ? "text-red-600 dark:text-red-400" : "text-red-500/50 dark:text-red-400/50"
                                : "text-muted-foreground/40"
                            }`}>
                              {dayValue > 0 ? (
                                <>
                                  <span className="md:hidden">{fmtShort(dayValue)}</span>
                                  <span className="hidden md:inline">{fmt(dayValue)}</span>
                                </>
                              ) : "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Row: Departamentos + Clientes ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top departamentos */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Departamentos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topDepts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sem dados de departamento</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topDepts} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: "#fff", color: "#000", fontSize: 12 }} labelStyle={{ color: "#000", fontWeight: "bold" }} itemStyle={{ color: "#000" }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {topDepts.map((_, i) => (
                        <Cell key={i} fill={`hsl(188, ${55 - i * 5}%, ${40 + i * 5}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top clientes */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Principais Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sem dados de clientes</p>
              ) : (
                <div className="space-y-2.5">
                  {topClients.map((c, i) => {
                    const maxTotal = topClients[0].total;
                    const barW = Math.round((c.total / maxTotal) * 100);
                    return (
                      <div key={c.name} className="flex items-center gap-2.5">
                        <span className="text-[11px] font-bold w-4 text-muted-foreground shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium truncate text-foreground">{c.name}</span>
                            <span className="text-muted-foreground shrink-0 ml-2">{c.count}x</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${barW}%`, backgroundColor: TEAL }} />
                          </div>
                        </div>
                        <span className="text-[11px] tabular-nums font-semibold shrink-0 w-16 md:w-24 text-right" style={{ color: TEAL }}>
                          <span className="md:hidden">{fmtShort(c.total)}</span>
                          <span className="hidden md:inline">{fmt(c.total)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tipos de venda ────────────────────────────────────────────── */}
        {tiposVenda.length > 0 && (
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Distribuição por Tipo de Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {tiposVenda.map((t, i) => {
                  const pct = totalGeral > 0 ? Math.round((t.total / totalGeral) * 100) : 0;
                  return (
                    <div key={t.tipo} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-muted/30">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `hsl(188, ${55 - i * 8}%, ${40 + i * 6}%)` }} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{t.tipo}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtShort(t.total)} · {pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
