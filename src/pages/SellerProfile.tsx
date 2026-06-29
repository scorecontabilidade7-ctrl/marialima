import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useRawSalesData, useSalesData } from "@/hooks/useSalesData";
import { useCurrentMonthGoals } from "@/hooks/useMonthlyGoals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, ShoppingBag, Users, Award, DollarSign, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { BR_TIME_ZONE, getDatePartsInTimeZone } from "@/lib/utils";
import { calculateSingleDynamicCommission } from "@/hooks/useDynamicCommissions";
import {
  AreaChart, Area, BarChart, Bar, LabelList, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const TEAL = "hsl(188, 55%, 40%)";
const TEAL_LIGHT = "hsl(188, 48%, 88%)";
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toFixed(0)}`;
}
function formatMobileLabel(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

import { useVendedoresConfig } from "@/hooks/useVendedoresConfig";
import { useUserAccess } from "@/hooks/useUserAccess";

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

  // ── Current month ─────────────────────────────────────────────────────────
  const now = new Date();
  const { year: realYear, month: realMonth } = getDatePartsInTimeZone(now, BR_TIME_ZONE);
  
  const [selectedMonth, setSelectedMonth] = useState({
    year: searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : realYear,
    month: searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : realMonth
  });

  const currentYear = selectedMonth.year;
  const currentMonth = selectedMonth.month;
  const targetYearMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const selectedMonthLabel = `${MONTH_NAMES[currentMonth - 1]} de ${currentYear}`;
  const isCurrentMonth = currentYear === realYear && currentMonth === realMonth;

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

  const { data: goalData } = useCurrentMonthGoals(store, targetYearMonth);
  
  const initialCommissionStr = sessionStorage.getItem("dashboardCommissionMode");
  const commissionMode = (initialCommissionStr as "fixa" | "dinamica") || "dinamica";

  const dashboardFilters = {
    year: currentYear,
    month: currentMonth,
    vendedor: "all",
    departamento: "all",
  };
  const { data: dashboardData } = useSalesData(store, dashboardFilters);

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
  
  const ticketMedio = myVendas.length > 0 ? totalGeral / myVendas.length : 0;
  const numPedidos = myVendas.length;

  // ── All sellers rank ──────────────────────────────────────────────────────
  const rank = useMemo(() => {
    if (!dashboardData?.ranking) return 0;
    return dashboardData.ranking.findIndex((r) => r.vendedor === sellerName) + 1;
  }, [dashboardData, sellerName]);

  const sellerCount = Math.max(dashboardData?.ranking?.length || 1, 1);
  const comissaoFixaMes = monthVendas.reduce((s, v) => s + v.comissao_vendedor, 0);
  const comissaoDinamicaMes = useMemo(() => calculateSingleDynamicCommission(totalMes, sellerCount, goalData), [totalMes, sellerCount, goalData]);
  const displayComissao = commissionMode === "dinamica" ? comissaoDinamicaMes : comissaoFixaMes;

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

  // ── Top departments ───────────────────────────────────────────────────────
  const topDepts = useMemo(() => {
    const map: Record<string, number> = {};
    myDetalhada.forEach((d) => {
      if (d.departamento) map[d.departamento] = (map[d.departamento] || 0) + d.subtotal;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, total]) => ({ name, total }));
  }, [myDetalhada]);

  // ── Top clients ───────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    myVendas.forEach((v) => {
      const c = v.cliente || "Desconhecido";
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += v.valor_total;
      map[c].count += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, d]) => ({ name, ...d }));
  }, [myVendas]);

  // ── Tipo de venda ─────────────────────────────────────────────────────────
  const tiposVenda = useMemo(() => {
    const map: Record<string, number> = {};
    myVendas.forEach((v) => {
      const t = v.tipo_venda || "Outros";
      map[t] = (map[t] || 0) + v.valor_total;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, total]) => ({ tipo, total }));
  }, [myVendas]);

  // ── Goal performance ──────────────────────────────────────────────────────
  const metas = goalData
    ? {
        minima: goalData.meta_minima / sellerCount,
        top1: goalData.meta_top1 / sellerCount,
        top2: goalData.meta_top2 / sellerCount,
        master: goalData.meta_master / sellerCount,
      }
    : { minima: 18000, top1: 22000, top2: 26000, master: 30000 };

  const goalLevels = [
    { label: "Meta Mínima", value: metas.minima, color: "hsl(215 52% 52%)", perc: 0.010 },
    { label: "Top 1",       value: metas.top1,   color: "hsl(188 55% 40%)", perc: 0.013 },
    { label: "Top 2",       value: metas.top2,   color: "hsl(172 48% 42%)", perc: 0.015 },
    { label: "Master",      value: metas.master, color: "hsl(38 92% 50%)",  perc: 0.020 },
  ];

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
        
        <div className="flex flex-1 justify-center">
          <div className="flex items-center gap-1 h-9 border border-border rounded-md bg-secondary px-1">
            <button
              onClick={goToPrevMonth}
              className="p-1 rounded hover:bg-accent transition-colors"
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
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
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

            {/* Month highlight */}
            <div className="text-center sm:text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 bg-muted/50 text-muted-foreground px-2.5 py-1 rounded-md mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAL }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{selectedMonthLabel}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold leading-none truncate" style={{ color: TEAL }}>{fmt(totalMes)}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{monthVendas.length} pedido{monthVendas.length !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Histórico",  
              value: (
                <>
                  <span className="sm:hidden">{fmtShort(totalGeral)}</span>
                  <span className="hidden sm:inline">{fmt(totalGeral)}</span>
                </>
              ), 
              icon: DollarSign,  
              sub: `${numPedidos} pedidos` 
            },
            { label: "Comissão no Mês",   value: fmtShort(displayComissao), icon: Award,       sub: commissionMode === "dinamica" ? "dinâmica" : "fixa" },
            { label: "Ticket Médio",     value: fmtShort(ticketMedio),  icon: TrendingUp,  sub: "por pedido" },
            { label: "Pedidos no Mês",   value: String(monthVendas.length), icon: ShoppingBag, sub: `em ${selectedMonthLabel.toLowerCase()}` },
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
              <CardTitle className="text-sm font-bold">Performance de Metas — {selectedMonthLabel}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goalLevels.map((g) => {
                const pct = Math.min((totalMes / g.value) * 100, 100);
                const reached = totalMes >= g.value;
                return (
                  <div key={g.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{g.label}</span>
                      <span className={reached ? "font-bold" : "text-muted-foreground"} style={reached ? { color: g.color } : {}}>
                        {reached ? "✓ Atingida" : `${pct.toFixed(0)}% — faltam ${fmt(g.value - totalMes)}`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: g.color }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-[10px] text-muted-foreground">Comissão ({(g.perc * 100).toFixed(1).replace(".", ",")}%): <span className="font-medium">{fmt(g.value * g.perc)}</span></p>
                      <p className="text-[10.5px] text-muted-foreground text-right">{fmt(g.value)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

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
